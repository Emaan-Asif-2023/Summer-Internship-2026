from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    bio: Optional[str] = ""
    department: Optional[str] = ""
    year_of_study: Optional[int] = None
    skills: Optional[List[str]] = []
    interests: Optional[List[str]] = []
    roles: Optional[List[str]] = []
    availability: Optional[str] = ""
    open_to_team: Optional[bool] = True
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_completed: Optional[bool] = False
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    name: str
    bio: Optional[str] = ""
    department: Optional[str] = ""
    year_of_study: Optional[int] = None
    skills: Optional[List[str]] = []
    interests: Optional[List[str]] = []
    roles: Optional[List[str]] = []
    availability: Optional[str] = ""
    open_to_team: Optional[bool] = True
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str
