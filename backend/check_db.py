
import os
from sqlmodel import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

# Force standard localhost URL if env var is weird, but try to use .env first
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in environment, using default")
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/teaching_app"

print(f"Connecting to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("Successfully connected to the database!")
        
        # Check if table exists
        insp = inspect(engine)
        if "classsession" in insp.get_table_names():
            print("Table 'classsession' exists.")
            columns = [c['name'] for c in insp.get_columns("classsession")]
            print(f"Columns: {columns}")
            
            # Check for new columns
            required = ["teacher_id", "room_name", "participants"]
            missing = [c for c in required if c not in columns]
            if missing:
                print(f"MISSING COLUMNS: {missing}")
                # We will need to migrate
            else:
                print("All required columns present.")
        else:
            print("Table 'classsession' does NOT exist.")

except Exception as e:
    print(f"Connection failed: {e}")
