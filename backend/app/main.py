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

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# ---- CORS ----
# ---- CORS (temporary debug: allow everything) ----
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # <-- temporary: allow all origins so browser won't block
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Startup: create DB tables ----
# Mount static files for serving uploaded files
import pathlib
STATIC_DIR = pathlib.Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

# ---- Auth endpoints ----
@app.post("/api/auth/register", response_model=UserOut)
def register(user_in: UserCreate, session=Depends(get_session)):
    # DEBUG: inspect incoming password (temporary)
    try:
        pw = user_in.password
        # safe repr to avoid printing secrets in logs for long term — this is temporary
        print("DEBUG: password type:", type(pw), "repr:", repr(pw)[:200])
        if isinstance(pw, str):
            print("DEBUG: password length (bytes):", len(pw.encode("utf-8")))
        else:
            print("DEBUG: password is not a string")
    except Exception as e:
        print("DEBUG: error inspecting password:", e)

    existing = get_user_by_email(session, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    # proceed to hashing (or fail early if password looks wrong)
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, session=Depends(get_session)):
    # Generic response to avoid user enumeration
    generic_response = {"message": "If this email exists, an OTP has been sent."}

    user = get_user_by_email(session, payload.email)
    if not user:
        # Don't reveal that the user doesn't exist
        return generic_response

    # Generate OTP
    code = generate_otp_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate previous unused codes (optional safety)
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

    # Dev: still log it so you can see in console
    print(f"[DEV] OTP for {user.email}: {code} (valid until {expires_at})")

    # Dev: keep dev_otp in response until you're confident; remove later in prod
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

    # Issue a normal access token (same as password login)
    token = create_access_token(subject=user.email, data={"role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/me", response_model=UserOut)
def me(token: str = Depends(oauth2_scheme), session=Depends(get_session)):
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
    Returns courses based on user role:
    - Teachers: courses they created
    - Students: courses they are enrolled in
    
    Each course includes sessions and enrollment count.
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


@app.get("/api/courses/{course_id}/sessions")
def get_course_sessions(
    course_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all sessions for a course"""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    sessions_list = session.exec(
        select(ClassSession).where(ClassSession.course_id == course_id)
        .order_by(ClassSession.start_time.desc())
    ).all()
    
    result = []
    for cs in sessions_list:
        result.append({
            "id": cs.id,
            "course_id": cs.course_id,
            "title": cs.title,
            "start_time": cs.start_time.isoformat() if cs.start_time else None,
            "end_time": cs.end_time.isoformat() if cs.end_time else None,
            "meeting_url": cs.meeting_url or "",
            "status": cs.status,
            "course_title": course.title
        })
    
    return result


@app.post("/api/courses/{course_id}/sessions", response_model=ClassSessionOut)
def create_class_session(
    course_id: int,
    data: ClassSessionCreate,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the course teacher can create sessions")

    end_time = data.start_time + timedelta(minutes=data.duration_minutes)

    cs = ClassSession(
        course_id=course.id,
        title=data.title,
        start_time=data.start_time,
        end_time=end_time,
        meeting_url=data.meeting_url,
        status="scheduled",
    )
    session.add(cs)
    session.commit()
    session.refresh(cs)

    return ClassSessionOut(
        id=cs.id,
        course_id=cs.course_id,
        title=cs.title,
        start_time=cs.start_time,
        end_time=cs.end_time,
        meeting_url=cs.meeting_url,
        status=cs.status,
        course_title=course.title,
    )


@app.post("/api/sessions/{session_id}/join")
def join_session(
    session_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Join a session and get a LiveKit token for the classroom."""
    cs = session.get(ClassSession, session_id)
    if not cs:
        raise HTTPException(status_code=404, detail="Session not found")

    course = session.get(Course, cs.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check authorization - teacher or enrolled student
    is_teacher = course.teacher_id == current_user.id
    is_enrolled = session.exec(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course.id
        )
    ).first() is not None

    if not is_teacher and not is_enrolled:
        raise HTTPException(status_code=403, detail="Not authorized to join this session")

    # Set session to live if teacher is starting it
    if is_teacher and cs.status == "scheduled":
        cs.status = "live"
        cs.room_name = f"session-{session_id}"
        session.add(cs)
        session.commit()
        session.refresh(cs)

    # Generate LiveKit token
    room_name = cs.room_name or f"session-{session_id}"
    participant_identity = f"user-{current_user.id}"
    participant_name = current_user.full_name or current_user.email

    livekit_token = create_livekit_token(room_name, participant_identity, participant_name)

    return {
        "livekit_token": livekit_token,
        "session": {
            "id": cs.id,
            "title": cs.title,
            "status": cs.status,
            "room_name": room_name,
            "course_title": course.title
        }
    }


@app.post("/api/sessions/{session_id}/start", response_model=ClassSessionOut)
def start_session(
    session_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    cs = session.get(ClassSession, session_id)
    if not cs:
        raise HTTPException(status_code=404, detail="Session not found")

    course = session.get(Course, cs.course_id)
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    cs.status = "live"
    session.add(cs)
    session.commit()
    session.refresh(cs)

    return ClassSessionOut(
        id=cs.id,
        course_id=cs.course_id,
        title=cs.title,
        start_time=cs.start_time,
        end_time=cs.end_time,
        meeting_url=cs.meeting_url,
        status=cs.status,
        course_title=course.title,
    )


@app.post("/api/sessions/{session_id}/end", response_model=ClassSessionOut)
def end_session(
    session_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    cs = session.get(ClassSession, session_id)
    if not cs:
        raise HTTPException(status_code=404, detail="Session not found")

    course = session.get(Course, cs.course_id)
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    cs.status = "ended"
    session.add(cs)
    session.commit()
    session.refresh(cs)

    return ClassSessionOut(
        id=cs.id,
        course_id=cs.course_id,
        title=cs.title,
        start_time=cs.start_time,
        end_time=cs.end_time,
        meeting_url=cs.meeting_url,
        status=cs.status,
        course_title=course.title,
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
            
        # The URL should be accessible from the frontend.
        # Since we mounted /static, the URL is /static/filename
        # We need the full URL or relative. Frontend will likely prepend API_URL if it's relative?
        # Actually standard practice is usually a relative path or absolute URL.
        # Since this is a simple app, let's just return /static/filename and assume frontend knows where the server is.
        # But wait, frontend runs on 5173, backend on 8000.
        # So it should probably be http://localhost:8000/static/filename
        # Or I can just return /static/filename and frontend uses "API_URL + /static/..." ?
        # Or better yet, just return the path relative to the server root.
        
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


# ---- Class Session endpoints ----
import json

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
    return class_session


@app.post("/api/sessions/{session_id}/join")
def join_class_session(
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
    elif current_user.role == "student":
        enrollment = db_session.exec(
            select(Enrollment).where(
                Enrollment.student_id == current_user.id,
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
    livekit_token = create_livekit_token(
        room_name=class_session.room_name,
        participant_identity=str(current_user.id),
        participant_name=current_user.full_name or f"User {current_user.id}"
    )

    return {
        "class_token": class_token,
        "livekit_token": livekit_token,
        "meeting_url": class_session.meeting_url,
        "session": class_session
    }


@app.post("/api/sessions/{session_id}/end", response_model=ClassSessionOut)
def end_class_session(
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
    
    class_session.status = "ended"
    class_session.end_time = datetime.utcnow()
    db_session.add(class_session)
    db_session.commit()
    db_session.refresh(class_session)
    return class_session


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
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == class_session.course_id
            )
        ).first()
        if not enrollment:
            raise HTTPException(403, "Not enrolled")
    
    return class_session


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
                Enrollment.student_id == current_user.id,
                Enrollment.course_id == course_id
            )
        ).first()
        if not enrollment:
            raise HTTPException(403, "Not enrolled")
    
    sessions = db_session.exec(
        select(ClassSession).where(ClassSession.course_id == course_id)
    ).all()
    return sessions
