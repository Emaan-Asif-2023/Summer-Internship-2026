from fastapi import APIRouter, HTTPException, Depends, status
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/projects", tags=["projects"])

PROJECT_STATUSES = ["Recruiting", "In Progress", "Completed"]


# ---------- Payloads ----------

class ProjectCreatePayload(BaseModel):
    title: str
    description: str
    skills: Optional[List[str]] = []
    max_members: int = 5
    status: Optional[str] = "Recruiting"


class ProjectUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    max_members: Optional[int] = None
    status: Optional[str] = None


class InvitePayload(BaseModel):
    to_user_id: str


class JoinRequestPayload(BaseModel):
    message: Optional[str] = ""


class RespondPayload(BaseModel):
    action: str  # "accept" | "decline"


# ---------- Helpers ----------

def user_summary(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "name": u.get("name"),
        "email": u.get("email"),
        "department": u.get("department"),
        "university": u.get("university"),
        "semester": u.get("semester"),
        "skills": u.get("skills", []),
        "avatar_url": u.get("avatar_url"),
    }


async def serialize_project(db, proj: dict, current_user_id: ObjectId) -> dict:
    owner = await db.users.find_one({"_id": proj["owner_id"]})
    return {
        "id": str(proj["_id"]),
        "title": proj["title"],
        "description": proj["description"],
        "skills": proj.get("skills", []),
        "status": proj.get("status", "Recruiting"),
        "max_members": proj.get("max_members", 5),
        "member_count": len(proj.get("member_ids", [])),
        "owner_id": str(proj["owner_id"]),
        "owner_name": owner.get("name") if owner else "Unknown",
        "is_owner": proj["owner_id"] == current_user_id,
        "created_at": proj.get("created_at"),
        "updated_at": proj.get("updated_at"),
    }


async def get_owned_project_or_404(db, project_id: str, owner_id: ObjectId) -> dict:
    try:
        pid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format")
    proj = await db.projects.find_one({"_id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj["owner_id"] != owner_id:
        raise HTTPException(status_code=403, detail="Only the project owner can do this")
    return proj


# ---------- Create / Read / Update / Delete ----------

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreatePayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if payload.status not in PROJECT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if payload.max_members < 1:
        raise HTTPException(status_code=400, detail="max_members must be at least 1")

    owner_id = current_user["_id"]
    now = datetime.utcnow()
    new_proj = {
        "title": payload.title,
        "description": payload.description,
        "skills": payload.skills or [],
        "status": payload.status,
        "owner_id": owner_id,
        "max_members": payload.max_members,
        "member_ids": [owner_id],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.projects.insert_one(new_proj)
    new_proj["_id"] = result.inserted_id
    return await serialize_project(db, new_proj, owner_id)


@router.get("/my")
async def get_my_projects(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    docs = await db.projects.find({"owner_id": owner_id}).sort("created_at", -1).to_list(length=200)
    return [await serialize_project(db, d, owner_id) for d in docs]


@router.get("/joined")
async def get_joined_projects(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    docs = await db.projects.find({
        "member_ids": user_id,
        "owner_id": {"$ne": user_id}
    }).sort("created_at", -1).to_list(length=200)
    return [await serialize_project(db, d, user_id) for d in docs]


# NOTE: static sub-routes (/invitations/received, /requests/sent, /requests/received)
# are declared further below but MUST be registered before "/{project_id}" in FastAPI's
# router if declared after in the same file with matching prefix depth - since these are
# nested one level deeper than "/{project_id}" (2 path segments vs 1), there is no
# collision here. Kept in this order for readability of the CRUD block.

@router.get("/{project_id}")
async def get_project_detail(
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        pid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format")

    proj = await db.projects.find_one({"_id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    data = await serialize_project(db, proj, current_user["_id"])
    members = await db.users.find({"_id": {"$in": proj.get("member_ids", [])}}).to_list(length=200)
    data["members"] = [user_summary(m) for m in members]
    return data


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    payload: ProjectUpdatePayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    proj = await get_owned_project_or_404(db, project_id, current_user["_id"])

    updates = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    if "status" in updates and updates["status"] not in PROJECT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if "max_members" in updates and updates["max_members"] < len(proj.get("member_ids", [])):
        raise HTTPException(status_code=400, detail="max_members cannot be less than current member count")

    if updates:
        updates["updated_at"] = datetime.utcnow()
        await db.projects.update_one({"_id": proj["_id"]}, {"$set": updates})

    updated = await db.projects.find_one({"_id": proj["_id"]})
    return await serialize_project(db, updated, current_user["_id"])


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    proj = await get_owned_project_or_404(db, project_id, current_user["_id"])
    await db.projects.delete_one({"_id": proj["_id"]})
    await db.project_invitations.delete_many({"project_id": proj["_id"]})
    await db.project_requests.delete_many({"project_id": proj["_id"]})
    return {"message": "Project deleted"}


@router.post("/{project_id}/leave")
async def leave_project(
    project_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        pid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format")
    proj = await db.projects.find_one({"_id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    user_id = current_user["_id"]
    if proj["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Owner cannot leave their own project. Delete it instead.")
    if user_id not in proj.get("member_ids", []):
        raise HTTPException(status_code=400, detail="You are not a member of this project")

    await db.projects.update_one(
        {"_id": pid},
        {"$pull": {"member_ids": user_id}, "$set": {"updated_at": datetime.utcnow()}}
    )
    return {"message": "Left project"}


# ---------- Invitations (owner invites a user to their project) ----------

@router.post("/{project_id}/invite", status_code=status.HTTP_201_CREATED)
async def invite_user(
    project_id: str,
    payload: InvitePayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    proj = await get_owned_project_or_404(db, project_id, current_user["_id"])

    try:
        to_user_id = ObjectId(payload.to_user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid to_user_id format")

    target = await db.users.find_one({"_id": to_user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    if to_user_id in proj.get("member_ids", []):
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    if len(proj.get("member_ids", [])) >= proj.get("max_members", 5):
        raise HTTPException(status_code=400, detail="Project is already full")

    existing = await db.project_invitations.find_one({
        "project_id": proj["_id"],
        "to_user_id": to_user_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="An invitation is already pending for this user")

    now = datetime.utcnow()
    await db.project_invitations.insert_one({
        "project_id": proj["_id"],
        "invited_by": current_user["_id"],
        "to_user_id": to_user_id,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    })
    return {"message": "Invitation sent"}


@router.get("/invitations/received")
async def get_received_invitations(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    pipeline = [
        {"$match": {"to_user_id": user_id, "status": "pending"}},
        {"$lookup": {"from": "projects", "localField": "project_id", "foreignField": "_id", "as": "project"}},
        {"$unwind": "$project"},
        {"$lookup": {"from": "users", "localField": "invited_by", "foreignField": "_id", "as": "inviter"}},
        {"$unwind": "$inviter"},
        {"$sort": {"created_at": -1}},
    ]
    docs = await db.project_invitations.aggregate(pipeline).to_list(length=200)
    return [{
        "id": str(d["_id"]),
        "status": d["status"],
        "created_at": d["created_at"],
        "project": {
            "id": str(d["project"]["_id"]),
            "title": d["project"]["title"],
            "description": d["project"]["description"],
            "skills": d["project"].get("skills", []),
            "status": d["project"].get("status"),
        },
        "invited_by": user_summary(d["inviter"]),
    } for d in docs]


@router.post("/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: str,
    payload: RespondPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if payload.action not in ("accept", "decline"):
        raise HTTPException(status_code=400, detail="Invalid action, must be 'accept' or 'decline'")

    try:
        inv_id = ObjectId(invitation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid invitation_id format")

    invitation = await db.project_invitations.find_one({"_id": inv_id})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation["to_user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="You are not authorized to respond to this invitation")
    if invitation["status"] != "pending":
        raise HTTPException(status_code=400, detail="This invitation has already been resolved")

    if payload.action == "accept":
        proj = await db.projects.find_one({"_id": invitation["project_id"]})
        if not proj:
            raise HTTPException(status_code=404, detail="Project no longer exists")
        if len(proj.get("member_ids", [])) >= proj.get("max_members", 5):
            raise HTTPException(status_code=400, detail="Project is already full")
        await db.projects.update_one(
            {"_id": proj["_id"]},
            {"$addToSet": {"member_ids": current_user["_id"]}, "$set": {"updated_at": datetime.utcnow()}}
        )
        await db.project_invitations.update_one(
            {"_id": inv_id}, {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Invitation accepted"}
    else:
        await db.project_invitations.update_one(
            {"_id": inv_id}, {"$set": {"status": "declined", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Invitation declined"}


# ---------- Join Requests (a student requests to join someone else's project) ----------

@router.post("/{project_id}/request", status_code=status.HTTP_201_CREATED)
async def request_to_join(
    project_id: str,
    payload: JoinRequestPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        pid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project_id format")

    proj = await db.projects.find_one({"_id": pid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    user_id = current_user["_id"]
    if proj["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="You already own this project")
    if user_id in proj.get("member_ids", []):
        raise HTTPException(status_code=400, detail="You are already a member of this project")
    if len(proj.get("member_ids", [])) >= proj.get("max_members", 5):
        raise HTTPException(status_code=400, detail="Project is already full")

    existing = await db.project_requests.find_one({
        "project_id": pid,
        "user_id": user_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request for this project")

    now = datetime.utcnow()
    await db.project_requests.insert_one({
        "project_id": pid,
        "user_id": user_id,
        "message": payload.message or "",
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    })
    return {"message": "Join request sent"}


@router.get("/requests/sent")
async def get_sent_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    user_id = current_user["_id"]
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$lookup": {"from": "projects", "localField": "project_id", "foreignField": "_id", "as": "project"}},
        {"$unwind": "$project"},
        {"$sort": {"created_at": -1}},
    ]
    docs = await db.project_requests.aggregate(pipeline).to_list(length=200)
    return [{
        "id": str(d["_id"]),
        "status": d["status"],
        "message": d.get("message", ""),
        "created_at": d["created_at"],
        "project": {
            "id": str(d["project"]["_id"]),
            "title": d["project"]["title"],
            "status": d["project"].get("status"),
        },
    } for d in docs]


@router.get("/requests/received")
async def get_received_requests(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    my_project_ids = await db.projects.find({"owner_id": owner_id}).distinct("_id")
    if not my_project_ids:
        return []

    pipeline = [
        {"$match": {"project_id": {"$in": my_project_ids}, "status": "pending"}},
        {"$lookup": {"from": "projects", "localField": "project_id", "foreignField": "_id", "as": "project"}},
        {"$unwind": "$project"},
        {"$lookup": {"from": "users", "localField": "user_id", "foreignField": "_id", "as": "requester"}},
        {"$unwind": "$requester"},
        {"$sort": {"created_at": -1}},
    ]
    docs = await db.project_requests.aggregate(pipeline).to_list(length=200)
    return [{
        "id": str(d["_id"]),
        "status": d["status"],
        "message": d.get("message", ""),
        "created_at": d["created_at"],
        "project": {
            "id": str(d["project"]["_id"]),
            "title": d["project"]["title"],
        },
        "requester": user_summary(d["requester"]),
    } for d in docs]


@router.post("/requests/{request_id}/respond")
async def respond_to_join_request(
    request_id: str,
    payload: RespondPayload,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    if payload.action not in ("accept", "decline"):
        raise HTTPException(status_code=400, detail="Invalid action, must be 'accept' or 'decline'")

    try:
        req_id = ObjectId(request_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request_id format")

    req = await db.project_requests.find_one({"_id": req_id})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    proj = await db.projects.find_one({"_id": req["project_id"]})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj["owner_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the project owner can respond to this request")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request has already been resolved")

    if payload.action == "accept":
        if len(proj.get("member_ids", [])) >= proj.get("max_members", 5):
            raise HTTPException(status_code=400, detail="Project is already full")
        await db.projects.update_one(
            {"_id": proj["_id"]},
            {"$addToSet": {"member_ids": req["user_id"]}, "$set": {"updated_at": datetime.utcnow()}}
        )
        await db.project_requests.update_one(
            {"_id": req_id}, {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Request accepted"}
    else:
        await db.project_requests.update_one(
            {"_id": req_id}, {"$set": {"status": "declined", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Request declined"}
