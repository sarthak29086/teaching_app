
import os
from sqlmodel import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/teaching_app"

engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as connection:
        print("Starting migration...")
        
        # Add room_name
        try:
            connection.execute(text("ALTER TABLE classsession ADD COLUMN IF NOT EXISTS room_name VARCHAR"))
            print("Added room_name column")
        except Exception as e:
            print(f"Error adding room_name: {e}")

        # Add participants
        try:
            connection.execute(text("ALTER TABLE classsession ADD COLUMN IF NOT EXISTS participants VARCHAR DEFAULT '[]'"))
            print("Added participants column")
        except Exception as e:
            print(f"Error adding participants: {e}")

        # Add teacher_id
        try:
            connection.execute(text("ALTER TABLE classsession ADD COLUMN IF NOT EXISTS teacher_id INTEGER"))
            print("Added teacher_id column")
        except Exception as e:
            print(f"Error adding teacher_id: {e}")
            
        connection.commit()
        print("Migration complete!")

if __name__ == "__main__":
    run_migration()
