# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import SQLModel, select
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import List
import os
import shutil
import uuid
import json
import pathlib

from .database import engine, get_session
from .models import User, OtpCode, Course, Enrollment, ClassSession, Announcement, Note
from .schemas import (
    UserCreate,
    Token,
    UserOut,
    ForgotPasswordRequest,
    OtpLoginRequest,
    CourseCreate,
    CourseOut,
    ClassSessionCreate,
    ClassSessionOut,
    AnnouncementCreate,
    AnnouncementOut,
    NoteCreate,
    NoteOut,
)
from .crud import get_user_by_email, create_user
from .auth import hash_password, verify_password, create_access_token, generate_otp_code
from .email_utils import send_otp_email
from .livekit_utils import create_livekit_token
from dotenv import load_dotenv


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "teaching_app")
ALGORITHM = "HS256"

app = FastAPI(title="Teaching App Backend (Auth)")

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # <-- temporary: allow all origins so browser won't block
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Startup: create DB tables ----
# Mount static files for serving uploaded files
STATIC_DIR = pathlib.Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), session=Depends(get_session)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_email(session, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ---- Auth endpoints ----
@app.post("/api/auth/register", response_model=UserOut)
def register(user_in: UserCreate, session=Depends(get_session)):
    existing = get_user_by_email(session, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        hashed = hash_password(user_in.password)
    except Exception as e:
        print("ERROR during hashing:", repr(e))
        raise HTTPException(status_code=500, detail=f"Hashing error: {str(e)}")
    user = create_user(session, email=user_in.email, full_name=user_in.full_name,
                       hashed_password=hashed, role=user_in.role)
    return user


@app.post("/api/auth/login", response_model=Token)
def login(credentials: UserCreate, session=Depends(get_session)):
    user = get_user_by_email(session, credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=user.email, data={"role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, session=Depends(get_session)):
    # Generic response to avoid user enumeration
    generic_response = {"message": "If this email exists, an OTP has been sent."}

    user = get_user_by_email(session, payload.email)
    if not user:
        return generic_response

    # Generate OTP
    code = generate_otp_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate previous unused codes
    stmt = select(OtpCode).where(OtpCode.user_id == user.id, OtpCode.used == False)
    for existing in session.exec(stmt):
        existing.used = True

    otp = OtpCode(
        user_id=user.id,
        code=code,
        expires_at=expires_at,
        used=False,
    )
    session.add(otp)
    session.commit()

    # SEND EMAIL
    send_otp_email(user.email, code)

    # Dev: log OTP
    print(f"[DEV] OTP for {user.email}: {code} (valid until {expires_at})")

    return {
        **generic_response,
        "dev_otp": code,
    }


@app.post("/api/auth/otp-login", response_model=Token)
def otp_login(payload: OtpLoginRequest, session=Depends(get_session)):
    user = get_user_by_email(session, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP or email",
        )

    # Find latest unused, unexpired OTP for this user
    stmt = (
        select(OtpCode)
        .where(
            OtpCode.user_id == user.id,
            OtpCode.code == payload.code,
            OtpCode.used == False,
            OtpCode.expires_at > datetime.utcnow(),
        )
        .order_by(OtpCode.created_at.desc())
    )

    otp = session.exec(stmt).first()

    if not otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    # Mark OTP as used
    otp.used = True
    session.add(otp)
    session.commit()

    # Issue a normal access token
    token = create_access_token(subject=user.email, data={"role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ---- Course Endpoints ----

@app.post("/api/courses", response_model=CourseOut)
def create_course(
    data: CourseCreate,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create courses")

    course = Course(
        title=data.title,
        description=data.description,
        teacher_id=current_user.id,
    )
    session.add(course)
    session.commit()
    session.refresh(course)
    return course

@app.get("/api/courses")
def list_courses(session=Depends(get_session)):
    """List all available courses with teacher names"""
    courses = session.exec(select(Course)).all()
    result = []
    for course in courses:
        teacher = session.get(User, course.teacher_id)
        result.append({
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "teacher_id": course.teacher_id,
            "teacher_name": teacher.full_name if teacher else "Unknown"
        })
    return result

@app.post("/api/courses/{course_id}/enroll")
def enroll_in_course(
    course_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # idempotent: don't duplicate enrollment
    existing = session.exec(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    ).first()
    if existing:
        return {"message": "Already enrolled"}

    enrollment = Enrollment(user_id=current_user.id, course_id=course_id)
    session.add(enrollment)
    session.commit()
    return {"message": "Enrolled"}

@app.get("/api/my/courses")
def my_courses(
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Returns courses based on user role.
    """
    if current_user.role == "teacher":
        # Teachers see courses they created
        courses = session.exec(
            select(Course).where(Course.teacher_id == current_user.id)
        ).all()
    else:
        # Students see courses they're enrolled in
        enrollments = session.exec(
            select(Enrollment).where(Enrollment.user_id == current_user.id)
        ).all()
        if not enrollments:
            return []
        course_ids = [e.course_id for e in enrollments]
        courses = session.exec(
            select(Course).where(Course.id.in_(course_ids))
        ).all()
    
    # Enrich each course with sessions and enrollment count
    result = []
    for course in courses:
        # Get sessions for this course
        course_sessions = session.exec(
            select(ClassSession).where(ClassSession.course_id == course.id)
        ).all()
        
        # Get enrollment count
        enrollment_count = len(session.exec(
            select(Enrollment).where(Enrollment.course_id == course.id)
        ).all())
        
        # Get teacher name
        teacher = session.get(User, course.teacher_id)
        teacher_name = teacher.full_name if teacher else "Unknown"
        
        # Build session list
        sessions_out = []
        for s in course_sessions:
            sessions_out.append({
                "id": s.id,
                "course_id": s.course_id,
                "title": s.title,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "meeting_url": s.meeting_url,
                "status": s.status,
                "course_title": course.title
            })
        
        result.append({
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "teacher_id": course.teacher_id,
            "teacher_name": teacher_name,
            "sessions": sessions_out,
            "enrollment_count": enrollment_count
        })
    
    return result


@app.get("/api/courses/{course_id}/sessions", response_model=List[ClassSessionOut])
def list_course_sessions(
    course_id: int,
    db_session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all sessions for a course"""
    course = db_session.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    
    # Verify access
    if current_user.role == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(403, "Not your course")
    elif current_user.role == "student":
        enrollment = db_session.exec(
            select(Enrollment).where(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == course_id
            )
        ).first()
        if not enrollment:
            raise HTTPException(403, "Not enrolled")

    sessions = db_session.exec(
        select(ClassSession).where(ClassSession.course_id == course_id)
        .order_by(ClassSession.start_time.desc())
    ).all()
    
    # Manually construct ClassSessionOut to include course_title
    result = []
    for s in sessions:
        result.append(ClassSessionOut(
            id=s.id,
            course_id=s.course_id,
            title=s.title,
            start_time=s.start_time,
            end_time=s.end_time,
            meeting_url=s.meeting_url,
            status=s.status,
            course_title=course.title
        ))
    return result


@app.post("/api/courses/{course_id}/sessions", response_model=ClassSessionOut)
def create_class_session(
    course_id: int,
    data: ClassSessionCreate,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a live class session (teacher only)"""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(403, "Only the course teacher can create sessions")

    # Generate unique room name
    room_name = f"course{course_id}_sess{uuid.uuid4().hex[:8]}"
    # Placeholder meeting URL (will integrate LiveKit in Phase 2)
    meeting_url = f"https://meet.placeholder/{room_name}"

    class_session = ClassSession(
        course_id=course_id,
        teacher_id=current_user.id,
        title=data.title,
        start_time=data.start_time,
        status="scheduled",
        meeting_url=meeting_url,
        room_name=room_name,
        participants="[]"
    )
    session.add(class_session)
    session.commit()
    session.refresh(class_session)

    return ClassSessionOut(
        id=class_session.id,
        course_id=class_session.course_id,
        title=class_session.title,
        start_time=class_session.start_time,
        end_time=class_session.end_time,
        meeting_url=class_session.meeting_url,
        status=class_session.status,
        course_title=course.title
    )


@app.post("/api/sessions/{session_id}/join")
def join_session(
    session_id: int,
    db_session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Join a class session (teacher/student)"""
    class_session = db_session.get(ClassSession, session_id)
    if not class_session:
        raise HTTPException(404, "Session not found")

    # Check if user is teacher or enrolled student
    course = db_session.get(Course, class_session.course_id)
    if current_user.role == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(403, "Not your course")

        # Teacher auto-starts the session
        if class_session.status == "scheduled":
            class_session.status = "live"
            # If room name wasn't set (from legacy code), set it now
            if not class_session.room_name:
                class_session.room_name = f"session-{session_id}"
            db_session.add(class_session)
            db_session.commit()
            db_session.refresh(class_session)

    elif current_user.role == "student":
        enrollment = db_session.exec(
            select(Enrollment).where(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == class_session.course_id
            )
        ).first()
        if not enrollment:
            raise HTTPException(403, "Not enrolled in this course")
    else:
        raise HTTPException(403, "Invalid role")

    # Add user to participants if not already there
    participants = json.loads(class_session.participants)
    if current_user.id not in participants:
        participants.append(current_user.id)
        class_session.participants = json.dumps(participants)
        db_session.add(class_session)
        db_session.commit()

    # Create class-specific token
    token_data = {
        "sub": str(current_user.id),
        "role": current_user.role,
        "class_id": class_session.course_id,
        "session_id": session_id,
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    class_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    # Generate LiveKit Token
    room_name = class_session.room_name or f"session-{session_id}"
    livekit_token = create_livekit_token(
        room_name=room_name,
        participant_identity=str(current_user.id),
        participant_name=current_user.full_name or f"User {current_user.id}"
    )

    return {
        "class_token": class_token,
        "livekit_token": livekit_token,
        "meeting_url": class_session.meeting_url,
        "session": class_session # This returns ORM object. Might miss course_title if schema expects it nested in session?
        # Actually join_session returns a dict, not ClassSessionOut response model.
        # But "session" key in the dict needs to be serialized.
        # If frontend expects course_title inside session object, we might need to add it.
        # Fastapi will serialize the ORM object. If we want course_title, we need to convert it or ensure frontend doesn't need it or model has it.
    }


@app.post("/api/sessions/{session_id}/end", response_model=ClassSessionOut)
def end_session(
    session_id: int,
    db_session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """End a class session (teacher only)"""
    class_session = db_session.get(ClassSession, session_id)
    if not class_session:
        raise HTTPException(404, "Session not found")
    if class_session.teacher_id != current_user.id:
        raise HTTPException(403, "Only the teacher can end the session")

    course = db_session.get(Course, class_session.course_id)

    class_session.status = "ended"
    class_session.end_time = datetime.utcnow()
    db_session.add(class_session)
    db_session.commit()
    db_session.refresh(class_session)

    return ClassSessionOut(
        id=class_session.id,
        course_id=class_session.course_id,
        title=class_session.title,
        start_time=class_session.start_time,
        end_time=class_session.end_time,
        meeting_url=class_session.meeting_url,
        status=class_session.status,
        course_title=course.title
    )


@app.get("/api/sessions/{session_id}", response_model=ClassSessionOut)
def get_class_session(
    session_id: int,
    db_session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get session details"""
    class_session = db_session.get(ClassSession, session_id)
    if not class_session:
        raise HTTPException(404, "Session not found")

    # Verify access
    course = db_session.get(Course, class_session.course_id)
    if current_user.role == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(403, "Not authorized")
    elif current_user.role == "student":
        enrollment = db_session.exec(
            select(Enrollment).where(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == class_session.course_id
            )
        ).first()
        if not enrollment:
            raise HTTPException(403, "Not enrolled")

    return ClassSessionOut(
        id=class_session.id,
        course_id=class_session.course_id,
        title=class_session.title,
        start_time=class_session.start_time,
        end_time=class_session.end_time,
        meeting_url=class_session.meeting_url,
        status=class_session.status,
        course_title=course.title
    )


@app.get("/api/my/sessions", response_model=List[ClassSessionOut])
def my_sessions(
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # find courses user is enrolled in
    enrollments = session.exec(
        select(Enrollment).where(Enrollment.user_id == current_user.id)
    ).all()
    if not enrollments:
        return []

    course_ids = [e.course_id for e in enrollments]
    courses = session.exec(
        select(Course).where(Course.id.in_(course_ids))
    ).all()
    course_map = {c.id: c for c in courses}

    # get sessions for those courses
    sessions_list = session.exec(
        select(ClassSession).where(ClassSession.course_id.in_(course_ids))
    ).all()

    result = []
    for cs in sessions_list:
        course = course_map.get(cs.course_id)
        result.append(
            ClassSessionOut(
                id=cs.id,
                course_id=cs.course_id,
                title=cs.title,
                start_time=cs.start_time,
                end_time=cs.end_time,
                meeting_url=cs.meeting_url,
                status=cs.status,
                course_title=course.title if course else "",
            )
        )
    return result


# ---- Announcement Endpoints ----

@app.get("/api/courses/{course_id}/announcements")
def get_announcements(
    course_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all announcements for a course"""
    announcements = session.exec(
        select(Announcement)
        .where(Announcement.course_id == course_id)
        .order_by(Announcement.created_at.desc())
    ).all()
    return announcements


@app.post("/api/courses/{course_id}/announcements")
def create_announcement(
    course_id: int,
    data: AnnouncementCreate,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an announcement (teacher only)"""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(403, "Only the course teacher can post announcements")
    
    announcement = Announcement(
        course_id=course_id,
        teacher_id=current_user.id,
        content=data.content
    )
    session.add(announcement)
    session.commit()
    session.refresh(announcement)
    return announcement


@app.delete("/api/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete an announcement"""
    announcement = session.get(Announcement, announcement_id)
    if not announcement:
        raise HTTPException(404, "Announcement not found")
    if announcement.teacher_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    
    session.delete(announcement)
    session.commit()
    return {"message": "Deleted"}


# ---- Note Endpoints ----

@app.get("/api/courses/{course_id}/notes")
def get_notes(
    course_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all notes for a course"""
    notes = session.exec(
        select(Note)
        .where(Note.course_id == course_id)
        .order_by(Note.created_at.desc())
    ).all()
    return notes


@app.post("/api/courses/{course_id}/notes")
def create_note(
    course_id: int,
    title: str = Form(...),
    content: str = Form(""),
    file: UploadFile = File(default=None),
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a note (teacher only)"""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(403, "Only the course teacher can add notes")
    
    file_url = None
    file_type = None

    if file:
        # Generate a unique filename
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        file_path = STATIC_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"/static/{filename}"
        file_type = file.content_type

    note = Note(
        course_id=course_id,
        teacher_id=current_user.id,
        title=title,
        content=content,
        file_url=file_url,
        file_type=file_type
    )
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@app.delete("/api/notes/{note_id}")
def delete_note(
    note_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a note"""
    note = session.get(Note, note_id)
    if not note:
        raise HTTPException(404, "Note not found")
    if note.teacher_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    
    session.delete(note)
    session.commit()
    return {"message": "Deleted"}
