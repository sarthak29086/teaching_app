import sys
sys.path.append('app')

from database import engine
from sqlmodel import text

# Add the new columns to the note table
with engine.connect() as conn:
    # Check if columns exist first
    result = conn.execute(text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'note' AND column_name IN ('file_url', 'file_type')
    """))
    existing_cols = [row[0] for row in result]
    
    if 'file_url' not in existing_cols:
        print("Adding file_url column...")
        conn.execute(text("ALTER TABLE note ADD COLUMN file_url VARCHAR"))
        conn.commit()
        print("✓ Added file_url column")
    else:
        print("✓ file_url column already exists")
    
    if 'file_type' not in existing_cols:
        print("Adding file_type column...")
        conn.execute(text("ALTER TABLE note ADD COLUMN file_type VARCHAR"))
        conn.commit()
        print("✓ Added file_type column")
    else:
        print("✓ file_type column already exists")

print("\nDatabase migration completed!")
