"""Student CRUD endpoints."""
import os, shutil
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db, Student, AttendanceRecord
from core.auth import get_current_user, FacultyUser
from core.recognition import rebuild_db
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASET_DIR

router = APIRouter(prefix="/api/students", tags=["students"])


class StudentOut(BaseModel):
    id: int
    name: str
    roll_no: str
    folder_name: str
    photo_count: int
    is_active: bool
    enrolled_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[StudentOut])
def list_students(db: Session = Depends(get_db), _=Depends(get_current_user)):
    students = db.query(Student).filter(Student.is_active == True).all()
    return [
        StudentOut(
            id=s.id, name=s.name, roll_no=s.roll_no,
            folder_name=s.folder_name, photo_count=s.photo_count,
            is_active=s.is_active, enrolled_at=str(s.enrolled_at),
        )
        for s in students
    ]


@router.get("/{roll_no}")
def get_student(roll_no: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(Student).filter(Student.roll_no == roll_no).first()
    if not s:
        raise HTTPException(404, "Student not found")
    return s


@router.delete("/{roll_no}")
def delete_student(
    roll_no: str,
    delete_records: bool = False,   # ?delete_records=true also wipes attendance
    db: Session = Depends(get_db),
    user: FacultyUser = Depends(get_current_user),
):
    if not user.is_admin:
        raise HTTPException(403, "Admin access required")
    s = db.query(Student).filter(Student.roll_no == roll_no).first()
    if not s:
        raise HTTPException(404, "Student not found")

    # Remove face images
    folder = os.path.join(DATASET_DIR, s.folder_name)
    if os.path.isdir(folder):
        shutil.rmtree(folder)

    # Optionally delete all attendance records
    if delete_records:
        deleted = db.query(AttendanceRecord)\
                    .filter(AttendanceRecord.roll_no == roll_no)\
                    .delete(synchronize_session=False)
        db.flush()

    s.is_active = False
    db.commit()
    rebuild_db()
    return {"message": f"Student {s.name} removed", "records_deleted": delete_records}


@router.delete("/{roll_no}/records")
def delete_student_records(
    roll_no: str,
    db: Session = Depends(get_db),
    user: FacultyUser = Depends(get_current_user),
):
    """Delete only the attendance records for a student, keep the student profile."""
    if not user.is_admin:
        raise HTTPException(403, "Admin access required")
    count = db.query(AttendanceRecord)\
               .filter(AttendanceRecord.roll_no == roll_no)\
               .delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {count} attendance records for roll {roll_no}"}


@router.patch("/{roll_no}/activate")
def activate_student(roll_no: str, db: Session = Depends(get_db), user: FacultyUser = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(403, "Admin access required")
    s = db.query(Student).filter(Student.roll_no == roll_no).first()
    if not s:
        raise HTTPException(404, "Student not found")
    s.is_active = True
    db.commit()
    return {"message": "Activated"}
