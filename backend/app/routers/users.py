from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import UpdateProfileRequest, UserResponse
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/users", tags=["users"])


def _user_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        bio=user.get("bio", "") or "",
        department=user.get("department", "") or "",
        university=user.get("university", "") or "",
        semester=user.get("semester"),
        year_of_study=user.get("year_of_study"),
        skills=user.get("skills", []),
        interests=user.get("interests", []),
        roles=user.get("roles", []),
        availability=user.get("availability", "") or "",
        open_to_team=user.get("open_to_team", True),
        github_url=user.get("github_url"),
        linkedin_url=user.get("linkedin_url"),
        avatar_url=user.get("avatar_url"),
        profile_completed=user.get("profile_completed", False),
        created_at=user["created_at"],
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    update_data = {
        "name": data.name.strip(),
        "bio": (data.bio or "").strip(),
        "department": (data.department or "").strip(),
        "university": (data.university or "").strip(),
        "semester": data.semester,
        "year_of_study": data.year_of_study,
        "skills": [s.strip() for s in data.skills if s.strip()],
        "interests": [i.strip() for i in data.interests if i.strip()],
        "roles": [r.strip() for r in data.roles if r.strip()],
        "availability": (data.availability or "").strip(),
        "open_to_team": data.open_to_team,
        "github_url": (data.github_url or "").strip() or None,
        "linkedin_url": (data.linkedin_url or "").strip() or None,
        "avatar_url": (data.avatar_url or "").strip() or None,
        "profile_completed": True  # Explicitly set to true on profile completion
    }

    # Verify input types or required profile values
    if not update_data["name"]:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if not update_data["department"]:
        raise HTTPException(status_code=400, detail="Department is required")
    if not update_data["university"]:
        raise HTTPException(status_code=400, detail="University/College is required")
    if not update_data["skills"]:
        raise HTTPException(status_code=400, detail="Please select at least one skill")

    # Update database
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )

    # Fetch updated user
    updated_user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_response(updated_user)


@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    result = await db.users.delete_one({"_id": ObjectId(current_user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Account deleted successfully"}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_response(user)

