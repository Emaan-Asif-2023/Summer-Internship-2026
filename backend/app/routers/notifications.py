from fastapi import APIRouter, HTTPException, Depends
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/notifications", tags=["notifications"])


def serialize(n: dict) -> dict:
    return {
        "id": str(n["_id"]),
        "type": n["type"],
        "title": n["title"],
        "body": n.get("body", ""),
        "data": n.get("data", {}),
        "read": n.get("read", False),
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
    return [serialize(d) for d in docs]


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
