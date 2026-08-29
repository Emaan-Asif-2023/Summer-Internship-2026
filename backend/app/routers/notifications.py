from fastapi import APIRouter, HTTPException, Depends
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/notifications", tags=["notifications"])


async def get_resolved_status(db, ntype: str, data: dict) -> str:
    if not data:
        return "pending"
    
    if ntype == "connection_request":
        cid = data.get("connection_id")
        if not cid:
            return "pending"
        try:
            doc = await db.connections.find_one({"_id": ObjectId(cid)})
            return doc.get("status", "pending") if doc else "declined"
        except Exception:
            return "declined"
            
    elif ntype == "project_invitation":
        iid = data.get("invitation_id")
        if not iid:
            return "pending"
        try:
            doc = await db.project_invitations.find_one({"_id": ObjectId(iid)})
            return doc.get("status", "pending") if doc else "declined"
        except Exception:
            return "declined"
            
    elif ntype == "project_join_request":
        rid = data.get("request_id")
        if not rid:
            return "pending"
        try:
            doc = await db.project_requests.find_one({"_id": ObjectId(rid)})
            return doc.get("status", "pending") if doc else "declined"
        except Exception:
            return "declined"
            
    return "pending"


async def serialize(db, n: dict) -> dict:
    resolved_status = None
    if n["type"] in ("connection_request", "project_invitation", "project_join_request"):
        resolved_status = await get_resolved_status(db, n["type"], n.get("data", {}))

    return {
        "id": str(n["_id"]),
        "type": n["type"],
        "title": n["title"],
        "body": n.get("body", ""),
        "data": n.get("data", {}),
        "read": n.get("read", False),
        "resolved_status": resolved_status,
        "created_at": n["created_at"],
    }


@router.get("")
async def get_notifications(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    docs = await db.notifications.find({"user_id": current_user["_id"]}) \
        .sort("created_at", -1).to_list(length=limit)
    return [await serialize(db, d) for d in docs]


@router.get("/unread-count")
async def get_unread_count(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    count = await db.notifications.count_documents({"user_id": current_user["_id"], "read": False})
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        nid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification id")
    result = await db.notifications.update_one(
        {"_id": nid, "user_id": current_user["_id"]},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    result = await db.notifications.update_many(
        {"user_id": current_user["_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"marked_read": result.modified_count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        nid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification id")
    await db.notifications.delete_one({"_id": nid, "user_id": current_user["_id"]})
    return {"message": "Deleted"}
