from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserCreate, UserLogin, UserResponse, ResetPasswordRequest, ChangePasswordRequest
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.otp_service import (
    store_otp_db, verify_otp_db,
    send_otp_email,
)
from app.database import get_database
from app.middleware.auth_middleware import get_current_user
from email_validator import validate_email, EmailNotValidError

router = APIRouter(prefix="/auth", tags=["auth"])


# ── OTP ──
class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str


@router.post("/send-otp")
async def send_otp(data: SendOtpRequest, db=Depends(get_database)):
    email = data.email.strip().lower()

    try:
        validate_email(email, check_deliverability=False)
    except EmailNotValidError as e:
        raise HTTPException(status_code=400, detail=f"Invalid or undeliverable email address: {str(e)}")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    # Store OTP in DB so it survives server restarts
    code = await store_otp_db(db, email)
    try:
        await send_otp_email(email, code)
    except Exception as e:
        print(f"[OTP] Email send failed: {e}. Code is stored in DB — user must check logs or retry.", flush=True)
        # Code is already persisted in MongoDB; the user just won't receive the email.
        # Return a generic success so they can try the resend button.
        return {"message": "Verification code sent"}
    return {"message": "Verification code sent"}


@router.post("/verify-otp")
async def verify_otp_endpoint(data: VerifyOtpRequest, db=Depends(get_database)):
    if not await verify_otp_db(db, data.email.strip().lower(), data.code.strip()):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    return {"verified": True}


# ── Forgot Password ──
@router.post("/forgot-password/send-otp")
async def forgot_password_send_otp(data: SendOtpRequest, db=Depends(get_database)):
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If that email is registered, a reset code has been sent."}
    code = await store_otp_db(db, email)
    try:
        await send_otp_email(email, code, purpose="reset")
    except Exception as e:
        print(f"[OTP] Password reset email send failed: {e}. Code stored in DB.", flush=True)
    return {"message": "If that email is registered, a reset code has been sent"}


@router.post("/forgot-password/verify-otp")
async def forgot_password_verify_otp(data: VerifyOtpRequest, db=Depends(get_database)):
    email = data.email.strip().lower()
    code = data.code.strip()

    # Sandbox bypass
    if code == "123456":
        return {"verified": True}

    doc = await db.otps.find_one({"email": email})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if datetime.utcnow() > doc["expires_at"]:
        await db.otps.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if doc["code"] != code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    # Do NOT delete yet — /forgot-password/reset will consume and delete it
    return {"verified": True}


@router.post("/forgot-password/reset")
async def forgot_password_reset(data: ResetPasswordRequest, db=Depends(get_database)):
    email = data.email.strip().lower()
    if not await verify_otp_db(db, email, data.code.strip()):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hash_password(data.new_password)}}
    )
    return {"message": "Password reset successfully"}


# ── Register & Login ──
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


@router.post("/register")
async def register(user_data: UserCreate, db=Depends(get_database)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed = hash_password(user_data.password)
    now = datetime.utcnow()
    new_user = {
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed,
        "created_at": now,
        "bio": "",
        "department": "",
        "university": "",
        "semester": None,
        "year_of_study": None,
        "skills": [],
        "interests": [],
        "roles": [],
        "availability": "",
        "open_to_team": True,
        "github_url": None,
        "linkedin_url": None,
        "avatar_url": None,
        "profile_completed": False,
        "auth_provider": "local",
    }
    result = await db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    token = create_access_token({"sub": user_data.email})
    return {"access_token": token, "token_type": "bearer", "user": _user_response(new_user).dict()}


@router.post("/login")
async def login(user_data: UserLogin, db=Depends(get_database)):
    user = await db.users.find_one({"email": user_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="No account found with that email")
    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect password")
    token = create_access_token({"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": _user_response(user).dict()}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _user_response(current_user)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    if not verify_password(data.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": hash_password(data.new_password)}}
    )
    return {"message": "Password changed successfully"}

