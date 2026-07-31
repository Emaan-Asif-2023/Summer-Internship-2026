from datetime import datetime
from typing import Optional
from bson import ObjectId
from app.services.ws_manager import manager

# type: connection_request | connection_accepted | project_invitation |
#       project_join_request | project_accepted | project_update | message


def _serialize(n: dict) -> dict:
    return {
        "id": str(n["_id"]),
        "type": n["type"],
        "title": n["title"],
        "body": n.get("body", ""),
        "data": n.get("data", {}),
        "read": n.get("read", False),
        "created_at": n["created_at"],
    }


async def create_notification(
    db,
    user_id: ObjectId,
    ntype: str,
    title: str,
    body: str = "",
    data: Optional[dict] = None,
) -> dict:
    """Create a notification document, push it live over the websocket, return it serialized."""
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "data": data or {},
        "read": False,
        "created_at": now,
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    serialized = _serialize(doc)
    await manager.send_to_user(str(user_id), {"event": "notification", "notification": serialized})
    return serialized


async def notify_many(db, user_ids, ntype: str, title: str, body: str = "", data: Optional[dict] = None):
    """Send the same notification to a list of user_ids (e.g. all project members)."""
    for uid in user_ids:
        await create_notification(db, uid, ntype, title, body, data)


async def upsert_message_notification(
    db,
    recipient_id: ObjectId,
    sender_id: ObjectId,
    sender_name: str,
    preview: str,
) -> dict:
    """
    Collapse chat notifications into one row per (recipient, sender) pair instead
    of one per message, so the bell shows a live-updating preview rather than spam.
    """
    now = datetime.utcnow()
    existing = await db.notifications.find_one({
        "user_id": recipient_id,
        "type": "message",
        "data.peer_id": str(sender_id),
    })
    if existing:
        await db.notifications.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "body": preview,
                "read": False,
                "created_at": now,
                "title": f"New message from {sender_name}",
            }}
        )
        doc = await db.notifications.find_one({"_id": existing["_id"]})
    else:
        doc = {
            "user_id": recipient_id,
            "type": "message",
            "title": f"New message from {sender_name}",
            "body": preview,
            "data": {"peer_id": str(sender_id)},
            "read": False,
            "created_at": now,
        }
        result = await db.notifications.insert_one(doc)
        doc["_id"] = result.inserted_id

    serialized = _serialize(doc)
    await manager.send_to_user(str(recipient_id), {"event": "notification", "notification": serialized})
    return serialized


async def mark_message_notification_read(db, recipient_id: ObjectId, sender_id: ObjectId):
    await db.notifications.update_many(
        {"user_id": recipient_id, "type": "message", "data.peer_id": str(sender_id), "read": False},
        {"$set": {"read": True}}
    )
