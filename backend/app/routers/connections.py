from fastapi import APIRouter, HTTPException, Depends, status
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from app.services.notification_service import create_notification
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/connections", tags=["connections"])

class ConnectionRequestPayload(BaseModel):
    to_user_id: str

class RespondRequestPayload(BaseModel):
    connection_id: str
    action: str


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def send_connection_request(
    payload: ConnectionRequestPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    sender_id = current_user["_id"]
    try:
        receiver_id = ObjectId(payload.to_user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid to_user_id format")

    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="You cannot connect with yourself")

    # Check if target user exists
    receiver = await db.users.find_one({"_id": receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check if a connection already exists
    existing = await db.connections.find_one({
        "$or": [
            {"sender_id": sender_id, "receiver_id": receiver_id},
            {"sender_id": receiver_id, "receiver_id": sender_id}
        ]
    })

    if existing:
        if existing["status"] == "accepted":
            raise HTTPException(status_code=400, detail="You are already connected")
        else:
            raise HTTPException(status_code=400, detail="A pending connection request already exists")

    new_conn = {
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.connections.insert_one(new_conn)

    await create_notification(
        db, receiver_id, "connection_request",
        title=f"{current_user.get('name', 'Someone')} sent you a connection request",
        data={"connection_id": str(result.inserted_id), "sender_id": str(sender_id)},
    )

    return {"message": "Connection request sent successfully"}


@router.get("/incoming")
async def get_incoming_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    receiver_id = current_user["_id"]
    pipeline = [
        {"$match": {"receiver_id": receiver_id, "status": "pending"}},
        {"$lookup": {
            "from": "users",
            "localField": "sender_id",
            "foreignField": "_id",
            "as": "sender"
        }},
        {"$unwind": "$sender"},
        {"$project": {
            "_id": 0,
            "id": {"$toString": "$_id"},
            "status": 1,
            "created_at": 1,
            "sender": {
                "id": {"$toString": "$sender._id"},
                "name": "$sender.name",
                "email": "$sender.email",
                "department": "$sender.department",
                "semester": "$sender.semester",
                "skills": "$sender.skills",
                "avatar_url": "$sender.avatar_url",
                "university": "$sender.university"
            }
        }}
    ]

    requests = await db.connections.aggregate(pipeline).to_list(length=100)
    for r in requests:
        if "sender" in r and r["sender"].get("avatar_url") in (None, "None", "null", ""):
            r["sender"]["avatar_url"] = None
    return requests


@router.post("/respond")
async def respond_to_request(
    payload: RespondRequestPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if payload.action not in ("accept", "decline"):
        raise HTTPException(status_code=400, detail="Invalid action, must be 'accept' or 'decline'")

    try:
        conn_id = ObjectId(payload.connection_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid connection_id format")

    connection = await db.connections.find_one({"_id": conn_id})
    if not connection:
        raise HTTPException(status_code=404, detail="Connection request not found")

    if connection["receiver_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="You are not authorized to respond to this request")

    if connection["status"] != "pending":
        raise HTTPException(status_code=400, detail="This connection request has already been resolved")

    if payload.action == "accept":
        await db.connections.update_one(
            {"_id": conn_id},
            {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
        )
        await create_notification(
            db, connection["sender_id"], "connection_accepted",
            title=f"{current_user.get('name', 'Someone')} accepted your connection request",
            data={"user_id": str(current_user["_id"])},
        )
        return {"message": "Connection request accepted"}
    else:
        await db.connections.delete_one({"_id": conn_id})
        return {"message": "Connection request declined"}


@router.get("")
async def get_connections(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    pipeline = [
        {"$match": {
            "$or": [{"sender_id": user_id}, {"receiver_id": user_id}],
            "status": "accepted"
        }},
        {"$lookup": {
            "from": "users",
            "localField": "sender_id",
            "foreignField": "_id",
            "as": "sender"
        }},
        {"$unwind": "$sender"},
        {"$lookup": {
            "from": "users",
            "localField": "receiver_id",
            "foreignField": "_id",
            "as": "receiver"
        }},
        {"$unwind": "$receiver"},
    ]

    docs = await db.connections.aggregate(pipeline).to_list(length=100)
    connections_list = []
    
    for doc in docs:
        # Determine who the counterpart user is
        other_user = doc["sender"] if doc["sender"]["_id"] != user_id else doc["receiver"]
        connections_list.append({
            "connection_id": str(doc["_id"]),
            "status": doc["status"],
            "created_at": doc["created_at"],
            "user": {
                "id": str(other_user["_id"]),
                "name": other_user.get("name"),
                "email": other_user.get("email"),
                "department": other_user.get("department"),
                "semester": other_user.get("semester"),
                "skills": other_user.get("skills", []),
                "avatar_url": None if other_user.get("avatar_url") in (None, "None", "null", "") else other_user.get("avatar_url"),
                "university": other_user.get("university")
            }
        })
        
    return connections_list


@router.get("/status")
async def get_all_connection_statuses(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    
    # Query all connections involving the current user
    conns = await db.connections.find({
        "$or": [{"sender_id": user_id}, {"receiver_id": user_id}]
    }).to_list(length=1000)
    
    connected_ids = []
    pending_sent_ids = []
    pending_received_ids = []
    
    for conn in conns:
        status_val = conn["status"]
        if status_val == "accepted":
            other = str(conn["receiver_id"] if conn["sender_id"] == user_id else conn["sender_id"])
            connected_ids.append(other)
        elif status_val == "pending":
            if conn["sender_id"] == user_id:
                pending_sent_ids.append(str(conn["receiver_id"]))
            else:
                pending_received_ids.append(str(conn["sender_id"]))
                
    return {
        "connected_ids": connected_ids,
        "pending_sent_ids": pending_sent_ids,
        "pending_received_ids": pending_received_ids
    }
