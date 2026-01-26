from sqlmodel import select
from .models import User
from sqlmodel import Session

def get_user_by_email(session: Session, email: str):
    stmt = select(User).where(User.email == email)
    return session.exec(stmt).first()

def create_user(session: Session, *, email: str, full_name: str, hashed_password: str, role: str):
    user = User(email=email, full_name=full_name, hashed_password=hashed_password, role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
