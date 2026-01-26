
from sqlmodel import create_engine, select, Session
from dotenv import load_dotenv
import os
from app.models import User, Course

load_dotenv()
DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/teaching_app" # Force correct port
engine = create_engine(DATABASE_URL)

def debug_data():
    with Session(engine) as session:
        print("--- USERS ---")
        users = session.exec(select(User)).all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")
            
        print("\n--- COURSES ---")
        courses = session.exec(select(Course)).all()
        for c in courses:
            print(f"ID: {c.id}, Title: {c.title}, TeacherID: {c.teacher_id}")
            
if __name__ == "__main__":
    debug_data()
