import os
from sqlmodel import create_engine, select, Session
from dotenv import load_dotenv
from app.models import User

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/teaching_app")

engine = create_engine(DATABASE_URL)

def list_accounts():
    with Session(engine) as session:
        try:
            users = session.exec(select(User)).all()
            if not users:
                print("No registered accounts found in the database.")
                return
            print(f"\n--- Registered Accounts ({len(users)}) ---")
            for user in users:
                print(f"ID: {user.id} | Email: {user.email} | Name: {user.full_name} | Role: {user.role} | Created: {user.created_at}")
        except Exception as e:
            print(f"Error fetching accounts: {e}")

if __name__ == "__main__":
    list_accounts()
