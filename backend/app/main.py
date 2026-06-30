# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import SQLModel, select
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import List, Optional
import os
import shutil
import uuid

from .database import engine, get_session
from .models import User, OtpCode, Course, Enrollment, ClassSession, Announcement, Note, DriveItem, Assignment, AssignmentSubmission
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

app = FastAPI(title="GyanSetu Backend")

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

    # Sync to Cloud Drive if file is attached
    if file_url:
        try:
            # Ensure course folder exists
            course_folder = session.exec(
                select(DriveItem).where(DriveItem.course_id == course_id, DriveItem.is_folder == True)
            ).first()
            if not course_folder:
                course = session.get(Course, course_id)
                course_title = course.title if course else f"Course {course_id}"
                course_folder = DriveItem(
                    name=course_title,
                    is_folder=True,
                    course_id=course_id,
                    uploader_id=current_user.id,
                    parent_id=None
                )
                session.add(course_folder)
                session.commit()
                session.refresh(course_folder)
            
            # Determine physical file size
            file_size = None
            if file_url.startswith("/static/"):
                local_path = STATIC_DIR / file_url.replace("/static/", "")
                if local_path.exists():
                    file_size = os.path.getsize(local_path)
            
            # Create a DriveItem inside this course folder
            drive_file = DriveItem(
                name=file.filename,
                is_folder=False,
                parent_id=course_folder.id,
                uploader_id=current_user.id,
                file_url=file_url,
                file_type=file_type,
                file_size=file_size
            )
            session.add(drive_file)
            session.commit()
        except Exception as sync_err:
            # Don't fail note creation if drive sync fails
            print(f"Error syncing note file to drive: {sync_err}")

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


# ---- Cloud Drive Endpoints ----
from pydantic import BaseModel

class FolderCreateSchema(BaseModel):
    name: str
    parent_id: Optional[int] = None

class MoveItemSchema(BaseModel):
    item_id: int
    new_parent_id: Optional[int] = None

def has_folder_access(folder_id: int, user: User, session) -> bool:
    """Check if the user has read/write permission to a folder"""
    if user.role == "teacher":
        return True
    
    # Query student enrolled course IDs
    enrolled = session.exec(select(Enrollment).where(Enrollment.user_id == user.id)).all()
    enrolled_course_ids = {e.course_id for e in enrolled}
    
    curr_id = folder_id
    while curr_id is not None:
        item = session.get(DriveItem, curr_id)
        if not item:
            return False
        
        # If it is associated with a course, verify enrollment
        if item.course_id is not None:
            return item.course_id in enrolled_course_ids
            
        # If it's a root-level custom folder, check ownership
        if item.parent_id is None:
            return item.uploader_id == user.id
            
        curr_id = item.parent_id
        
    return False

@app.get("/api/drive/list")
def list_drive_items(
    parent_id: Optional[int] = None,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    List items inside a parent folder.
    If parent_id is None (root), auto-generate folders for courses as a self-healing sync.
    """
    if parent_id is None:
        try:
            # Self-healing sync: Ensure a folder exists for every course
            courses = session.exec(select(Course)).all()
            existing_course_folders = session.exec(
                select(DriveItem).where(DriveItem.is_folder == True, DriveItem.course_id != None)
            ).all()
            existing_course_ids = {cf.course_id for cf in existing_course_folders}
            
            for course in courses:
                if course.id not in existing_course_ids:
                    # Create default folder for course
                    new_folder = DriveItem(
                        name=course.title,
                        is_folder=True,
                        course_id=course.id,
                        uploader_id=course.teacher_id,
                        parent_id=None
                    )
                    session.add(new_folder)
                    session.commit()
        except Exception as e:
            print(f"Error self-healing course folders: {e}")
    else:
        # Check permissions for non-root folders
        if not has_folder_access(parent_id, current_user, session):
            raise HTTPException(status_code=403, detail="Access denied to this folder")

    # Query folder contents
    if parent_id is None:
        statement = select(DriveItem).where(DriveItem.parent_id == None).order_by(DriveItem.is_folder.desc(), DriveItem.name.asc())
    else:
        statement = select(DriveItem).where(DriveItem.parent_id == parent_id).order_by(DriveItem.is_folder.desc(), DriveItem.name.asc())
        
    items = session.exec(statement).all()
    
    # Filter items for student access at root level
    if parent_id is None and current_user.role == "student":
        enrolled = session.exec(select(Enrollment).where(Enrollment.user_id == current_user.id)).all()
        enrolled_course_ids = {e.course_id for e in enrolled}
        
        filtered_items = []
        for item in items:
            # Show if course folder for enrolled course
            if item.course_id is not None:
                if item.course_id in enrolled_course_ids:
                    filtered_items.append(item)
            # Show if custom folder owned by the student
            elif item.uploader_id == current_user.id:
                filtered_items.append(item)
        items = filtered_items

    result = []
    for item in items:
        uploader = session.get(User, item.uploader_id)
        uploader_name = uploader.full_name if uploader else "System"
        result.append({
            "id": item.id,
            "name": item.name,
            "is_folder": item.is_folder,
            "parent_id": item.parent_id,
            "course_id": item.course_id,
            "uploader_id": item.uploader_id,
            "uploader_name": uploader_name,
            "file_url": item.file_url,
            "file_type": item.file_type,
            "file_size": item.file_size,
            "created_at": item.created_at
        })
    return result

@app.post("/api/drive/folders")
def create_drive_folder(
    data: FolderCreateSchema,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new custom folder"""
    folder = DriveItem(
        name=data.name.strip(),
        is_folder=True,
        parent_id=data.parent_id,
        uploader_id=current_user.id
    )
    session.add(folder)
    session.commit()
    session.refresh(folder)
    return folder

@app.get("/api/drive/folders/all")
def get_all_folders(
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Fetch all folders that the current user has access to, for move destination dropdown"""
    folders = session.exec(select(DriveItem).where(DriveItem.is_folder == True)).all()
    result = []
    for f in folders:
        # Exclude folders that cannot be accessed by the user
        if has_folder_access(f.id, current_user, session):
            result.append({
                "id": f.id,
                "name": f.name
            })
    return result

@app.post("/api/drive/move")
def move_drive_item(
    data: MoveItemSchema,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Move a file or folder to a new destination folder"""
    item = session.get(DriveItem, data.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Check permissions on the item being moved (must be uploader or a teacher)
    if item.uploader_id != current_user.id and current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized to move this item")
        
    # Prevent course folders from being moved (they should stay at root)
    if item.course_id is not None:
        raise HTTPException(status_code=400, detail="Cannot move course default folders")
        
    # Check destination folder permissions
    if data.new_parent_id is not None:
        dest = session.get(DriveItem, data.new_parent_id)
        if not dest:
            raise HTTPException(status_code=404, detail="Destination folder not found")
        if not dest.is_folder:
            raise HTTPException(status_code=400, detail="Destination must be a folder")
        if not has_folder_access(data.new_parent_id, current_user, session):
            raise HTTPException(status_code=403, detail="Access denied to destination folder")
            
        # Prevent cycles: moving a folder into itself or a subfolder of itself
        curr_id = data.new_parent_id
        while curr_id is not None:
            if curr_id == data.item_id:
                raise HTTPException(status_code=400, detail="Cannot move a folder into itself or its subfolders")
            curr_parent = session.get(DriveItem, curr_id)
            curr_id = curr_parent.parent_id if curr_parent else None
            
    # Perform move
    item.parent_id = data.new_parent_id
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.post("/api/drive/upload")
def upload_file_to_drive(
    file: UploadFile = File(...),
    parent_id: Optional[int] = Form(None),
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Upload a file to a specific folder on the local drive"""
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = STATIC_DIR / filename
    
    # Save the file locally
    contents = file.file.read()
    file_size = len(contents)
    
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
        
    file_url = f"/static/{filename}"
    
    drive_item = DriveItem(
        name=file.filename,
        is_folder=False,
        parent_id=parent_id,
        uploader_id=current_user.id,
        file_url=file_url,
        file_type=file.content_type,
        file_size=file_size
    )
    session.add(drive_item)
    session.commit()
    session.refresh(drive_item)
    return drive_item

@app.delete("/api/drive/items/{item_id}")
def delete_drive_item(
    item_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a drive file or folder recursively"""
    item = session.get(DriveItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Check authorization: uploader or any teacher can delete
    if item.uploader_id != current_user.id and current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
        
    def recursive_delete(db_item):
        if db_item.is_folder:
            # Query child items
            children = session.exec(select(DriveItem).where(DriveItem.parent_id == db_item.id)).all()
            for child in children:
                recursive_delete(child)
        else:
            # Delete local file if it exists
            if db_item.file_url:
                local_filename = db_item.file_url.replace("/static/", "")
                local_path = STATIC_DIR / local_filename
                if local_path.exists():
                    try:
                        os.remove(local_path)
                    except Exception as e:
                        print(f"Error removing physical file: {e}")
        session.delete(db_item)
        
    recursive_delete(item)
    session.commit()
    return {"message": "Deleted successfully"}


# ---- Assignments Endpoints ----

from pydantic import BaseModel

class GradeSubmissionSchema(BaseModel):
    marks: float
    feedback: Optional[str] = ""

@app.post("/api/courses/{course_id}/assignments")
def create_assignment(
    course_id: int,
    title: str = Form(...),
    description: str = Form(""),
    due_date: str = Form(...),
    file: UploadFile = File(default=None),
    session=Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    if current_user.role != "teacher" or course.teacher_id != current_user.id:
        raise HTTPException(403, "Only the course teacher can create assignments")
    
    # Parse due_date
    try:
        clean_due = due_date.replace("Z", "")
        # Handles T or space separating date and time
        if "T" in clean_due:
            # Check length to handle possible seconds or offsets
            parts = clean_due.split("T")
            time_part = parts[1][:5] # limit to HH:MM if it has more details
            clean_due = f"{parts[0]}T{time_part}"
            parsed_due = datetime.strptime(clean_due, "%Y-%m-%dT%H:%M")
        else:
            parsed_due = datetime.fromisoformat(clean_due)
    except Exception as e:
        raise HTTPException(400, detail=f"Invalid due_date format: {str(e)}. Must be YYYY-MM-DDTHH:MM")

    # Ensure course folder exists in Cloud Drive
    course_folder = session.exec(
        select(DriveItem).where(DriveItem.course_id == course_id, DriveItem.is_folder == True, DriveItem.parent_id == None)
    ).first()
    if not course_folder:
        course_folder = DriveItem(
            name=course.title,
            is_folder=True,
            course_id=course_id,
            uploader_id=current_user.id,
            parent_id=None
        )
        session.add(course_folder)
        session.commit()
        session.refresh(course_folder)

    # Create subfolder for this assignment in the course folder
    assignment_folder = DriveItem(
        name=title.strip(),
        is_folder=True,
        parent_id=course_folder.id,
        uploader_id=current_user.id,
        course_id=course_id
    )
    session.add(assignment_folder)
    session.commit()
    session.refresh(assignment_folder)

    file_url = None
    file_name = None

    if file:
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        file_path = STATIC_DIR / filename
        
        contents = file.file.read()
        file_size = len(contents)
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
            
        file_url = f"/static/{filename}"
        file_name = file.filename

        # Create DriveItem for teacher's assignment attachment
        drive_file = DriveItem(
            name=file_name,
            is_folder=False,
            parent_id=assignment_folder.id,
            uploader_id=current_user.id,
            file_url=file_url,
            file_type=file.content_type,
            file_size=file_size
        )
        session.add(drive_file)
        session.commit()

    assignment = Assignment(
        course_id=course_id,
        title=title.strip(),
        description=description,
        due_date=parsed_due,
        folder_id=assignment_folder.id,
        file_url=file_url,
        file_name=file_name
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    return assignment

@app.get("/api/courses/{course_id}/assignments")
def list_assignments(
    course_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
        
    # Check access: must be teacher or enrolled student
    if current_user.role == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(403, "Not your course")
    else:
        # Check enrollment
        enrolled = session.exec(
            select(Enrollment).where(Enrollment.user_id == current_user.id, Enrollment.course_id == course_id)
        ).first()
        if not enrolled:
            raise HTTPException(403, "Not enrolled in this course")

    assignments = session.exec(
        select(Assignment).where(Assignment.course_id == course_id).order_by(Assignment.created_at.desc())
    ).all()

    result = []
    for asm in assignments:
        asm_data = {
            "id": asm.id,
            "course_id": asm.course_id,
            "title": asm.title,
            "description": asm.description,
            "due_date": asm.due_date.isoformat(),
            "folder_id": asm.folder_id,
            "file_url": asm.file_url,
            "file_name": asm.file_name,
            "created_at": asm.created_at.isoformat()
        }
        
        # If student, attach their submission if it exists
        if current_user.role == "student":
            submission = session.exec(
                select(AssignmentSubmission).where(
                    AssignmentSubmission.assignment_id == asm.id,
                    AssignmentSubmission.student_id == current_user.id
                )
            ).first()
            if submission:
                lateness = None
                if submission.submitted_at > asm.due_date:
                    diff = submission.submitted_at - asm.due_date
                    days = diff.days
                    hours = diff.seconds // 3600
                    minutes = (diff.seconds % 3600) // 60
                    parts = []
                    if days > 0:
                        parts.append(f"{days}d")
                    if hours > 0:
                        parts.append(f"{hours}h")
                    if minutes > 0 or not parts:
                        parts.append(f"{minutes}m")
                    lateness = " ".join(parts) + " late"
                
                asm_data["submission"] = {
                    "id": submission.id,
                    "file_url": submission.file_url,
                    "file_name": submission.file_name,
                    "submitted_at": submission.submitted_at.isoformat(),
                    "marks": submission.marks,
                    "feedback": submission.feedback,
                    "lateness": lateness
                }
            else:
                asm_data["submission"] = None
        result.append(asm_data)
        
    return result

@app.post("/api/assignments/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
        
    course = session.get(Course, assignment.course_id)
    if not course:
        raise HTTPException(404, "Course not found")

    # Enforce student role
    if current_user.role != "student":
        raise HTTPException(403, "Only students can submit assignments")

    # Enforce enrollment
    enrolled = session.exec(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course.id
        )
    ).first()
    if not enrolled:
        raise HTTPException(403, "Not enrolled in this course")

    # Enforce PDF only!
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != ".pdf" and file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are allowed for submission")

    # Check if a submission already exists to replace it
    existing_sub = session.exec(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == current_user.id
        )
    ).first()

    # If exists, we can delete the old physical file and its DriveItem
    if existing_sub:
        if existing_sub.drive_item_id:
            old_item = session.get(DriveItem, existing_sub.drive_item_id)
            if old_item:
                if old_item.file_url:
                    old_filename = old_item.file_url.replace("/static/", "")
                    old_path = STATIC_DIR / old_filename
                    if old_path.exists():
                        try:
                            os.remove(old_path)
                        except Exception as e:
                            print(f"Error deleting old submission file: {e}")
                session.delete(old_item)
        session.delete(existing_sub)
        session.commit()

    # Save new file
    filename = f"{uuid.uuid4()}.pdf"
    file_path = STATIC_DIR / filename
    contents = file.file.read()
    file_size = len(contents)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
        
    file_url = f"/static/{filename}"
    display_name = f"{current_user.full_name or current_user.email} - Submission.pdf"

    # Save as DriveItem inside the assignment's folder
    drive_file = DriveItem(
        name=display_name,
        is_folder=False,
        parent_id=assignment.folder_id,
        uploader_id=current_user.id,
        file_url=file_url,
        file_type="application/pdf",
        file_size=file_size
    )
    session.add(drive_file)
    session.commit()
    session.refresh(drive_file)

    # Save submission
    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_url=file_url,
        file_name=file.filename,
        submitted_at=datetime.utcnow(),
        drive_item_id=drive_file.id
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)

    # Return submission details with computed lateness
    lateness = None
    if submission.submitted_at > assignment.due_date:
        diff = submission.submitted_at - assignment.due_date
        days = diff.days
        hours = diff.seconds // 3600
        minutes = (diff.seconds % 3600) // 60
        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0 or not parts:
            parts.append(f"{minutes}m")
        lateness = " ".join(parts) + " late"

    return {
        "id": submission.id,
        "file_url": submission.file_url,
        "file_name": submission.file_name,
        "submitted_at": submission.submitted_at.isoformat(),
        "marks": submission.marks,
        "feedback": submission.feedback,
        "lateness": lateness
    }

@app.get("/api/assignments/{assignment_id}/submissions")
def list_submissions(
    assignment_id: int,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
        
    course = session.get(Course, assignment.course_id)
    if not course:
        raise HTTPException(404, "Course not found")
        
    # Check teacher access
    if current_user.role != "teacher" or course.teacher_id != current_user.id:
        raise HTTPException(403, "Only the course teacher can view submissions")

    submissions = session.exec(
        select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id)
    ).all()

    # Also list all enrolled students to show who has NOT submitted
    enrollments = session.exec(
        select(Enrollment).where(Enrollment.course_id == course.id)
    ).all()

    student_map = {}
    for enr in enrollments:
        student = session.get(User, enr.user_id)
        if student:
            student_map[student.id] = student

    submissions_map = {sub.student_id: sub for sub in submissions}

    result = []
    # Loop over all enrolled students so the teacher sees a full dashboard
    for student_id, student in student_map.items():
        sub = submissions_map.get(student_id)
        sub_data = None
        if sub:
            lateness = None
            if sub.submitted_at > assignment.due_date:
                diff = sub.submitted_at - assignment.due_date
                days = diff.days
                hours = diff.seconds // 3600
                minutes = (diff.seconds % 3600) // 60
                parts = []
                if days > 0:
                    parts.append(f"{days}d")
                if hours > 0:
                    parts.append(f"{hours}h")
                if minutes > 0 or not parts:
                    parts.append(f"{minutes}m")
                lateness = " ".join(parts) + " late"
                
            sub_data = {
                "id": sub.id,
                "file_url": sub.file_url,
                "file_name": sub.file_name,
                "submitted_at": sub.submitted_at.isoformat(),
                "marks": sub.marks,
                "feedback": sub.feedback,
                "lateness": lateness
            }
            
        result.append({
            "student_id": student.id,
            "student_name": student.full_name or student.email,
            "student_email": student.email,
            "submission": sub_data
        })
        
    return result

@app.post("/api/submissions/{submission_id}/grade")
def grade_submission(
    submission_id: int,
    data: GradeSubmissionSchema,
    session=Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    submission = session.get(AssignmentSubmission, submission_id)
    if not submission:
        raise HTTPException(404, "Submission not found")
        
    assignment = session.get(Assignment, submission.assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
        
    course = session.get(Course, assignment.course_id)
    if not course:
        raise HTTPException(404, "Course not found")
        
    if current_user.role != "teacher" or course.teacher_id != current_user.id:
        raise HTTPException(403, "Only the course teacher can grade submissions")

    submission.marks = data.marks
    submission.feedback = data.feedback
    session.add(submission)
    session.commit()
    session.refresh(submission)
    return submission


