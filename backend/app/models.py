from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False)
    full_name: Optional[str] = None
    hashed_password: str
    role: str = Field(default="student")  # 'student' or 'teacher'
    created_at: datetime = Field(default_factory=datetime.utcnow)

# existing User model is already here...

class OtpCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int  # we just store the user id; no need for foreign key right now
    code: str     # 4-digit string like "1234"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used: bool = Field(default=False)

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

# ... your existing User and OtpCode models ...

class Course(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    teacher_id: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Enrollment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    course_id: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Announcement(SQLModel, table=True):
    """Course announcements posted by teachers"""
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int
    teacher_id: int
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Note(SQLModel, table=True):
    """Course notes/materials posted by teachers"""
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int
    teacher_id: int
    title: str
    content: str = ""
    file_url: Optional[str] = None
    file_type: Optional[str] = None  # 'pdf', 'ppt', etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ClassSession(SQLModel, table=True):
    """Live classroom sessions"""
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="course.id")
    teacher_id: int = Field(foreign_key="user.id")
    title: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = Field(default="scheduled")  # scheduled | live | ended
    meeting_url: Optional[str] = None
    room_name: Optional[str] = None
    participants: str = Field(default="[]")  # JSON string of user IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
