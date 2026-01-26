# backend/app/auth.py
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
import os
import random
from dotenv import load_dotenv

load_dotenv()

# Use argon2 for robust password hashing, keep bcrypt for legacy
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "teaching_app")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str, data: dict = None, expires_delta: int = None) -> str:
    to_encode = {"sub": subject}
    if data:
        to_encode.update(data)
    expire_minutes = expires_delta if expires_delta is not None else ACCESS_TOKEN_EXPIRE_MINUTES
    expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_otp_code() -> str:
    # 4-digit, always zero-padded ("0042")
    return f"{random.randint(0, 9999):04d}"
