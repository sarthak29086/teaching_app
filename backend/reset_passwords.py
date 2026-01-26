from sqlmodel import create_engine, select, Session
from dotenv import load_dotenv
import os
from app.models import User
from app.auth import hash_password

load_dotenv()
DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/teaching_app"
engine = create_engine(DATABASE_URL)

def reset_all_passwords():
    """Reset all user passwords to 'password123' with new Argon2 hashing"""
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        
        for user in users:
            # Reset password to 'password123'
            new_hash = hash_password("password123")
            user.hashed_password = new_hash
            session.add(user)
            print(f"Reset password for: {user.email} (ID: {user.id}, Role: {user.role})")
        
        session.commit()
        print(f"\n✅ Successfully reset passwords for {len(users)} users")
        print("All users can now login with password: password123")

if __name__ == "__main__":
    print("🔄 Resetting all user passwords to 'password123'...\n")
    reset_all_passwords()
