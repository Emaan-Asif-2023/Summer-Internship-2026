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
        "read": m.get("read", False),
        "read_at": m.get("read_at"),
        "created_at": m["created_at"],
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
    msg = {
        "sender_id": user_id,
        "receiver_id": pid,
        "conversation_key": conversation_key(user_id, pid),
        "type": "text",
        "text": text,
        "read": False,
        "created_at": now,
    }
    result = await db.messages.insert_one(msg)
    msg["_id"] = result.inserted_id
    serialized = serialize_message(msg)

    await manager.send_to_user(str(pid), {"event": "new_message", "message": serialized})
    print(f"[WS] send_to_user {str(pid)} — active connections: {list(manager.active.keys())}", flush=True)
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
        {"$set": {"read": True, "read_at": now}}
    )
    if result.modified_count:
        await manager.send_to_user(str(pid), {
            "event": "read_receipt",
            "by": str(user_id),
            "read_at": now.isoformat()
        })
    await mark_message_notification_read(db, recipient_id=user_id, sender_id=pid)
    return {"marked_read": result.modified_count}


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
