from fastapi import (
    APIRouter, HTTPException, Depends, status,
    UploadFile, File, WebSocket, WebSocketDisconnect, Query
)
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.auth_service import decode_access_token
from app.services.ws_manager import manager
from app.services.notification_service import upsert_message_notification, mark_message_notification_read
from app.config import settings
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from jose import JWTError
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/messages", tags=["messages"])
ws_router = APIRouter(tags=["messages-ws"])

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


# ---------- Helpers ----------

def conversation_key(a, b) -> str:
    return "_".join(sorted([str(a), str(b)]))


def serialize_message(m: dict) -> dict:
    return {
        "id": str(m["_id"]),
        "sender_id": str(m["sender_id"]),
        "receiver_id": str(m["receiver_id"]),
        "type": m["type"],
        "text": m.get("text"),
        "file_url": m.get("file_url"),
        "file_name": m.get("file_name"),
        "file_type": m.get("file_type"),
        "delivered": m.get("delivered", False),  # receiver's device received it
        "read": m.get("read", False),
        "read_at": m.get("read_at"),
        "created_at": m["created_at"],
        "reply_to": m.get("reply_to"),
        "reactions": m.get("reactions", {}),
        "deleted_for": m.get("deleted_for", []),
        "deleted_for_everyone": m.get("deleted_for_everyone", False),
    }


async def get_peer_or_404(db, peer_id: str) -> ObjectId:
    try:
        pid = ObjectId(peer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    peer = await db.users.find_one({"_id": pid})
    if not peer:
        raise HTTPException(status_code=404, detail="User not found")
    return pid


async def ensure_connected(db, user_id: ObjectId, peer_id: ObjectId):
    conn = await db.connections.find_one({
        "$or": [
            {"sender_id": user_id, "receiver_id": peer_id},
            {"sender_id": peer_id, "receiver_id": user_id},
        ],
        "status": "accepted"
    })
    if not conn:
        raise HTTPException(status_code=403, detail="You can only message users you're connected with")


# ---------- Payloads ----------

class SendTextPayload(BaseModel):
    text: str
    reply_to_id: Optional[str] = None  # message id being replied to


# ---------- Conversations list ----------

@router.get("/conversations")
async def get_conversations(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    conns = await db.connections.find({
        "$or": [{"sender_id": user_id}, {"receiver_id": user_id}],
        "status": "accepted"
    }).to_list(length=500)

    peer_ids = [c["receiver_id"] if c["sender_id"] == user_id else c["sender_id"] for c in conns]
    if not peer_ids:
        return []

    peers = await db.users.find({"_id": {"$in": peer_ids}}).to_list(length=500)
    peers_by_id = {p["_id"]: p for p in peers}

    results = []
    for pid in peer_ids:
        peer = peers_by_id.get(pid)
        if not peer:
            continue
        last_msg = await db.messages.find_one(
            {"conversation_key": conversation_key(user_id, pid)},
            sort=[("created_at", -1)]
        )
        unread_count = await db.messages.count_documents({
            "sender_id": pid,
            "receiver_id": user_id,
            "read": False
        })
        results.append({
            "peer": {
                "id": str(peer["_id"]),
                "name": peer.get("name"),
                "university": peer.get("university"),
                "avatar_url": None if peer.get("avatar_url") in (None, "None", "null", "") else peer.get("avatar_url"),
            },
            "last_message": serialize_message(last_msg) if last_msg else None,
            "unread_count": unread_count,
            "online": manager.is_online(str(pid)),
        })

    results.sort(
        key=lambda r: r["last_message"]["created_at"] if r["last_message"] else datetime.min,
        reverse=True
    )
    return results


# ---------- Message history ----------

@router.get("/{peer_id}")
async def get_message_history(
    peer_id: str,
    before: Optional[str] = Query(None, description="Message id cursor; returns messages created before this one"),
    limit: int = Query(30, ge=1, le=100),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)
    await ensure_connected(db, user_id, pid)

    query = {"conversation_key": conversation_key(user_id, pid)}
    # Exclude messages soft-deleted for this user
    query["deleted_for"] = {"$ne": str(user_id)}
    if before:
        try:
            before_msg = await db.messages.find_one({"_id": ObjectId(before)})
        except Exception:
            before_msg = None
        if before_msg:
            query["created_at"] = {"$lt": before_msg["created_at"]}

    docs = await db.messages.find(query).sort("created_at", -1).to_list(length=limit)
    docs.reverse()
    return [serialize_message(m) for m in docs]


# ---------- Send text ----------

@router.post("/{peer_id}/text", status_code=status.HTTP_201_CREATED)
async def send_text_message(
    peer_id: str,
    payload: SendTextPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message text cannot be empty")

    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)
    await ensure_connected(db, user_id, pid)

    now = datetime.utcnow()
    text = payload.text.strip()

    # Resolve reply_to snapshot
    reply_to_snapshot = None
    if payload.reply_to_id:
        try:
            original = await db.messages.find_one({"_id": ObjectId(payload.reply_to_id)})
            if original:
                reply_to_snapshot = {
                    "id": str(original["_id"]),
                    "sender_id": str(original["sender_id"]),
                    "text": original.get("text") or ("📷 Photo" if original.get("type") == "image" else f"📎 {original.get('file_name', 'File')}"),
                    "type": original.get("type", "text"),
                }
        except Exception:
            pass

    msg = {
        "sender_id": user_id,
        "receiver_id": pid,
        "conversation_key": conversation_key(user_id, pid),
        "type": "text",
        "text": text,
        "read": False,
        "delivered": False,
        "created_at": now,
        "reply_to": reply_to_snapshot,
        "reactions": {},
        "deleted_for": [],
        "deleted_for_everyone": False,
    }
    result = await db.messages.insert_one(msg)
    msg["_id"] = result.inserted_id

    # Mark delivered immediately if receiver is currently online
    receiver_online = manager.is_online(str(pid))
    if receiver_online:
        await db.messages.update_one({"_id": msg["_id"]}, {"$set": {"delivered": True}})
        msg["delivered"] = True

    serialized = serialize_message(msg)

    await manager.send_to_user(str(pid), {"event": "new_message", "message": serialized})
    print(f"[WS] send_to_user {str(pid)} — active connections: {list(manager.active.keys())}", flush=True)

    # Notify sender that message was delivered so their tick updates
    if receiver_online:
        await manager.send_to_user(str(user_id), {
            "event": "delivery_receipt",
            "message_id": serialized["id"],
        })
    return serialized


# ---------- Send image/file ----------

@router.post("/{peer_id}/upload", status_code=status.HTTP_201_CREATED)
async def send_file_message(
    peer_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)
    await ensure_connected(db, user_id, pid)

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 15MB limit")

    is_image = (file.content_type or "").startswith("image/")
    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            resource_type="image" if is_image else "raw",
            folder="teamsync_chat",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)[:200]}")

    now = datetime.utcnow()
    msg = {
        "sender_id": user_id,
        "receiver_id": pid,
        "conversation_key": conversation_key(user_id, pid),
        "type": "image" if is_image else "file",
        "file_url": upload_result.get("secure_url"),
        "file_name": file.filename,
        "file_type": file.content_type,
        "read": False,
        "created_at": now,
    }
    result = await db.messages.insert_one(msg)
    msg["_id"] = result.inserted_id
    serialized = serialize_message(msg)

    await manager.send_to_user(str(pid), {"event": "new_message", "message": serialized})
    print(f"[WS] send_to_user {str(pid)} — active connections: {list(manager.active.keys())}", flush=True)
    preview = "📷 Photo" if is_image else f"📎 {file.filename}"
    await upsert_message_notification(
        db, recipient_id=pid, sender_id=user_id,
        sender_name=current_user.get("name", "Someone"),
        preview=preview,
    )
    return serialized


# ---------- Read receipts ----------

@router.post("/{peer_id}/read")
async def mark_conversation_read(
    peer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)

    now = datetime.utcnow()
    result = await db.messages.update_many(
        {"sender_id": pid, "receiver_id": user_id, "read": False},
        {"$set": {"read": True, "delivered": True, "read_at": now}}
    )
    if result.modified_count:
        await manager.send_to_user(str(pid), {
            "event": "read_receipt",
            "by": str(user_id),
            "read_at": now.isoformat()
        })
    await mark_message_notification_read(db, recipient_id=user_id, sender_id=pid)
    return {"marked_read": result.modified_count}


# ---------- Delete a single message ----------

class DeleteMessagePayload(BaseModel):
    delete_for_everyone: bool = False  # True = unsend for both; False = delete only for me


@router.delete("/{peer_id}/{message_id}")
async def delete_message(
    peer_id: str,
    message_id: str,
    payload: DeleteMessagePayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)

    try:
        mid = ObjectId(message_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid message_id")

    msg = await db.messages.find_one({"_id": mid})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Only sender can delete for everyone; anyone in the conversation can delete for themselves
    if msg["conversation_key"] != conversation_key(user_id, pid):
        raise HTTPException(status_code=403, detail="Not your conversation")

    if payload.delete_for_everyone:
        if msg["sender_id"] != user_id:
            raise HTTPException(status_code=403, detail="Only the sender can unsend a message")
        await db.messages.update_one(
            {"_id": mid},
            {"$set": {
                "deleted_for_everyone": True,
                "text": None,
                "file_url": None,
                "file_name": None,
            }}
        )
        updated = await db.messages.find_one({"_id": mid})
        serialized = serialize_message(updated)
        # Notify the other person so their UI updates too
        await manager.send_to_user(str(pid), {"event": "message_deleted", "message": serialized})
    else:
        # Soft-delete: add user_id to deleted_for list
        await db.messages.update_one(
            {"_id": mid},
            {"$addToSet": {"deleted_for": str(user_id)}}
        )
        updated = await db.messages.find_one({"_id": mid})
        serialized = serialize_message(updated)

    return serialized


# ---------- React to a message ----------

class ReactPayload(BaseModel):
    emoji: str  # e.g. "👍", "❤️", "😂"


@router.post("/{peer_id}/{message_id}/react")
async def react_to_message(
    peer_id: str,
    message_id: str,
    payload: ReactPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)

    try:
        mid = ObjectId(message_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid message_id")

    msg = await db.messages.find_one({"_id": mid})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg["conversation_key"] != conversation_key(user_id, pid):
        raise HTTPException(status_code=403, detail="Not your conversation")

    emoji = payload.emoji.strip()
    uid_str = str(user_id)
    reactions = msg.get("reactions", {})

    # Toggle: if user already reacted with this emoji, remove it; else add it
    current_reactors = reactions.get(emoji, [])
    if uid_str in current_reactors:
        # Remove reaction
        current_reactors.remove(uid_str)
        if current_reactors:
            reactions[emoji] = current_reactors
        else:
            reactions.pop(emoji, None)
    else:
        # Remove any previous reaction by this user (one reaction per user)
        for e in list(reactions.keys()):
            if uid_str in reactions[e]:
                reactions[e].remove(uid_str)
                if not reactions[e]:
                    del reactions[e]
        # Add new reaction
        reactions.setdefault(emoji, []).append(uid_str)

    await db.messages.update_one({"_id": mid}, {"$set": {"reactions": reactions}})
    updated = await db.messages.find_one({"_id": mid})
    serialized = serialize_message(updated)

    # Push reaction update to the other person
    await manager.send_to_user(str(pid), {"event": "message_reacted", "message": serialized})
    return serialized


# ---------- Delete entire conversation (for current user only) ----------

@router.delete("/{peer_id}")
async def delete_conversation(
    peer_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
):
    user_id = current_user["_id"]
    pid = await get_peer_or_404(db, peer_id)
    uid_str = str(user_id)
    conv_key = conversation_key(user_id, pid)

    # Soft-delete: add user to deleted_for on every message in this conversation
    await db.messages.update_many(
        {"conversation_key": conv_key, "deleted_for": {"$ne": uid_str}},
        {"$addToSet": {"deleted_for": uid_str}}
    )
    return {"message": "Conversation cleared"}


# ---------- WebSocket ----------

async def authenticate_ws(token: str, db) -> Optional[dict]:
    try:
        payload = decode_access_token(token)
    except JWTError:
        return None
    email = payload.get("sub")
    if not email:
        return None
    return await db.users.find_one({"email": email})


@ws_router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    db=Depends(get_database),
):
    user = await authenticate_ws(token, db)
    if not user:
        await websocket.close(code=4401)
        return

    user_id = str(user["_id"])
    await manager.connect(user_id, websocket)

    # When user comes online, mark all undelivered messages they received as delivered
    # and notify each sender so their ticks update
    try:
        undelivered = await db.messages.find({
            "receiver_id": user["_id"],
            "delivered": False,
            "deleted_for_everyone": {"$ne": True},
        }).to_list(length=500)

        if undelivered:
            sender_ids = set()
            msg_ids = [m["_id"] for m in undelivered]
            await db.messages.update_many(
                {"_id": {"$in": msg_ids}},
                {"$set": {"delivered": True}}
            )
            for m in undelivered:
                sender_ids.add(str(m["sender_id"]))

            # Notify each sender that their messages were delivered
            for sid in sender_ids:
                affected_ids = [str(m["_id"]) for m in undelivered if str(m["sender_id"]) == sid]
                await manager.send_to_user(sid, {
                    "event": "bulk_delivery_receipt",
                    "message_ids": affected_ids,
                })
    except Exception as e:
        print(f"[WS] delivery receipt on connect failed: {e}", flush=True)
    try:
        while True:
            # Clients don't need to send anything for this to work; we just
            # keep the socket open to detect disconnects. Any inbound text
            # (e.g. a ping) is received and ignored. This single socket now
            # carries both chat events ("new_message"/"read_receipt") and
            # notification pushes ("notification") for this user.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)
