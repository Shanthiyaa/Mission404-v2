import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db import Base, User, Document, Conversation, Message, UserActivity, Notification

DATABASE_URL = "sqlite:///./data/app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

users = db.query(User).all()
print(f"Total users in DB: {len(users)}")
for u in users:
    print(f"User ID: {u.id}, Username: {u.username}, Email: {u.email}, Role: {u.role}")

# Try to create a dummy user and then delete it to verify cascade works
try:
    dummy = User(username="dummy", email="dummy@test.com", hashed_password="hashed_password_dummy", role="Technical Specialist")
    db.add(dummy)
    db.commit()
    print("Dummy user created successfully.")
    
    # Try deleting it
    db.delete(dummy)
    db.commit()
    print("Dummy user deleted successfully. Cascade works!")
except Exception as e:
    print(f"Error during dummy user lifecycle: {e}")
    db.rollback()

db.close()
