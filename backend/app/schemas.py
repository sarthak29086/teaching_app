from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "student"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: str

# your existing UserCreate, Token, UserOut are here...

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class OtpLoginRequest(BaseModel):
    email: EmailStr
    code: constr(min_length=4, max_length=4)


# ... your existing UserCreate, Token, UserOut, ForgotPasswordRequest, OtpLoginRequest ...

class CourseCreate(BaseModel):
    title: str
    description: str = ""


class CourseOut(BaseModel):
    id: int
    title: str
    description: str
    teacher_id: int
    teacher_name: Optional[str] = None
    sessions: list = []  # list of ClassSessionOut
    enrollment_count: int = 0

    class Config:
        orm_mode = True


class ClassSessionCreate(BaseModel):
    title: str
    start_time: datetime  # ISO string from frontend
    duration_minutes: int = 60
    meeting_url: str = ""  # Optional - can be added later or auto-generated


class ClassSessionOut(BaseModel):
    id: int
    course_id: int
    title: str
    start_time: datetime
    end_time: datetime | None
    meeting_url: str
    status: str
    course_title: str

    class Config:
        orm_mode = True


# Announcement schemas
class AnnouncementCreate(BaseModel):
    content: str


class AnnouncementOut(BaseModel):
    id: int
    course_id: int
    content: str
    created_at: datetime

    class Config:
        orm_mode = True


# Note schemas
class NoteCreate(BaseModel):
    title: str
    content: str = ""


class NoteOut(BaseModel):
    id: int
    course_id: int
    title: str
    content: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class ClassTokenPayload(BaseModel):
    """Payload for class-specific JWT tokens"""
    user_id: int
    role: str
    class_id: int
    session_id: int
