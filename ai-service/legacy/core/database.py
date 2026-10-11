"""SQLite database setup via SQLAlchemy."""
from sqlalchemy import (
    create_engine, Column, Integer, String, Date, Time,
    Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DB_PATH

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


# ── Models ────────────────────────────────────────────────────────────────────

class Student(Base):
    __tablename__ = "students"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(120), nullable=False)
    roll_no     = Column(String(20), unique=True, nullable=False, index=True)
    folder_name = Column(String(160), nullable=False)
    enrolled_at = Column(DateTime, server_default=func.now())
    photo_count = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)

    records     = relationship("AttendanceRecord", back_populates="student")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    roll_no    = Column(String(20), nullable=False, index=True)
    name       = Column(String(120), nullable=False)
    date       = Column(String(12), nullable=False, index=True)   # YYYY-MM-DD
    time       = Column(String(8),  nullable=False)               # HH:MM:SS
    confidence = Column(Float, default=0.0)
    subject    = Column(String(80), default="General")

    student    = relationship("Student", back_populates="records")


class SystemLog(Base):
    __tablename__ = "system_logs"

    id         = Column(Integer, primary_key=True, index=True)
    level      = Column(String(10), default="INFO")
    message    = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class FacultyUser(Base):
    __tablename__ = "faculty_users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(60), unique=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name       = Column(String(120), default="")
    is_admin        = Column(Boolean, default=False)
    created_at      = Column(DateTime, server_default=func.now())


def init_db():
    Base.metadata.create_all(bind=engine)
    # Seed default admin if none exists
    db = SessionLocal()
    try:
        from passlib.context import CryptContext
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        if not db.query(FacultyUser).first():
            db.add(FacultyUser(
                username="admin",
                hashed_password=ctx.hash("admin123"),
                full_name="System Admin",
                is_admin=True,
            ))
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
