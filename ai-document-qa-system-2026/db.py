import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# Load environment variables
load_dotenv()

# ── Database Connection Selection ─────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. A PostgreSQL database is required.")

# Ensure we use psycopg driver (psycopg3) and standard schema protocol name
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

from sqlalchemy.pool import NullPool  # 1. Import NullPool

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool  # 2. Replace pool_size, max_overflow, and pool_recycle with this
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    department = Column(String(100), nullable=True)
    display_name = Column(String(100), nullable=True)
    profile_picture = Column(Text, nullable=True)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="owner", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="owner", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(250), nullable=False)
    category = Column(String(100), nullable=False)
    size = Column(String(50), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    pages = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False)  # 'Processing', 'Indexed', 'Failed'
    task_id = Column(String(50), nullable=True)
    chunks = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="documents")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(250), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(50), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)     # JSON stringified citations array
    selected_docs = Column(Text, nullable=True) # JSON stringified selected documents list
    timestamp = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(String(250), nullable=False)
    color = Column(String(50), default="bg-purple-500")
    timestamp = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="activities")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=True)  # 'ai_answer', 'doc_processed', 'doc_failed', 'doc_deleted', 'duplicate_upload'
    text = Column(String(500), nullable=False)
    link = Column(String(250), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    title = Column(String(200), nullable=True)
    target_conv_id = Column(String(50), nullable=True)
    target_msg_id = Column(Integer, nullable=True)

    owner = relationship("User", back_populates="notifications")


# ── Initialization ────────────────────────────────────────────────────────────

def init_db():
    Base.metadata.create_all(bind=engine)
    # Check and add missing columns dynamically (e.g. for PostgreSQL migration compatibility)
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("users")]
    columns_notif = [c["name"] for c in inspector.get_columns("notifications")]
    with engine.begin() as conn:
        if "display_name" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(100)"))
        if "profile_picture" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_picture TEXT"))
        if "last_activity" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_activity TIMESTAMP"))
        if "title" not in columns_notif:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN title VARCHAR(200)"))
        if "target_conv_id" not in columns_notif:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN target_conv_id VARCHAR(50)"))
        if "target_msg_id" not in columns_notif:
            conn.execute(text("ALTER TABLE notifications ADD COLUMN target_msg_id INTEGER"))
