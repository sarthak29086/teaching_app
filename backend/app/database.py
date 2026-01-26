from sqlmodel import create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/teaching_app")

# echo=True will print SQL in console (helpful during dev)
engine = create_engine(DATABASE_URL, echo=False, connect_args={})
def get_session():
    with Session(engine) as session:
        yield session
