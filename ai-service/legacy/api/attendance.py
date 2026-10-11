"""Attendance read/export endpoints."""
import io
import csv
from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db, AttendanceRecord, Student
from core.auth import get_current_user
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DEFAULTER_THRESHOLD_PCT

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("/today")
def today_attendance(
    subject: str = "General",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    today = datetime.now().strftime("%Y-%m-%d")
    rows  = db.query(AttendanceRecord).filter(
        AttendanceRecord.date == today,
        AttendanceRecord.subject == subject,
    ).order_by(AttendanceRecord.time).all()
    return [
        {"name": r.name, "roll_no": r.roll_no, "time": r.time, "confidence": r.confidence}
        for r in rows
    ]


@router.get("/summary")
def summary(
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    subject:   str = "General",
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Per-student attendance count and percentage in a date range."""
    q = db.query(
        AttendanceRecord.roll_no,
        AttendanceRecord.name,
        func.count(func.distinct(AttendanceRecord.date)).label("days_present"),
    ).filter(AttendanceRecord.subject == subject)

    if date_from:
        q = q.filter(AttendanceRecord.date >= date_from)
    if date_to:
        q = q.filter(AttendanceRecord.date <= date_to)

    rows = q.group_by(AttendanceRecord.roll_no, AttendanceRecord.name).all()

    # Total unique class days in range
    dq = db.query(func.count(func.distinct(AttendanceRecord.date))).filter(
        AttendanceRecord.subject == subject
    )
    if date_from:
        dq = dq.filter(AttendanceRecord.date >= date_from)
    if date_to:
        dq = dq.filter(AttendanceRecord.date <= date_to)
    total_days = dq.scalar() or 1

    result = []
    for r in rows:
        pct = round((r.days_present / total_days) * 100, 1)
        result.append({
            "roll_no": r.roll_no,
            "name": r.name,
            "days_present": r.days_present,
            "total_days": total_days,
            "percentage": pct,
            "is_defaulter": pct < DEFAULTER_THRESHOLD_PCT,
        })
    return sorted(result, key=lambda x: x["roll_no"])


@router.get("/defaulters")
def defaulters(
    subject: str = "General",
    threshold: float = DEFAULTER_THRESHOLD_PCT,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    summary_data = summary(subject=subject, db=db, _=None)
    return [s for s in summary_data if s["percentage"] < threshold]


@router.get("/trend")
def trend(
    days: int = 30,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Daily attendance count for the last N days."""
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    rows  = db.query(
        AttendanceRecord.date,
        func.count(func.distinct(AttendanceRecord.roll_no)).label("count"),
    ).filter(AttendanceRecord.date >= since)\
     .group_by(AttendanceRecord.date)\
     .order_by(AttendanceRecord.date).all()
    return [{"date": r.date, "count": r.count} for r in rows]


@router.get("/log")
def full_log(
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AttendanceRecord)
    if search:
        q = q.filter(
            (AttendanceRecord.name.ilike(f"%{search}%")) |
            (AttendanceRecord.roll_no.ilike(f"%{search}%"))
        )
    if date_from:
        q = q.filter(AttendanceRecord.date >= date_from)
    if date_to:
        q = q.filter(AttendanceRecord.date <= date_to)

    total = q.count()
    rows  = q.order_by(AttendanceRecord.date.desc(), AttendanceRecord.time.desc())\
             .offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": [
            {"name": r.name, "roll_no": r.roll_no, "date": r.date,
             "time": r.time, "confidence": r.confidence, "subject": r.subject}
            for r in rows
        ],
    }


@router.get("/export/csv")
def export_csv(
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AttendanceRecord)
    if subject:
        q = q.filter(AttendanceRecord.subject == subject)
    rows = q.order_by(AttendanceRecord.date, AttendanceRecord.time).all()

    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["Name", "RollNo", "Date", "Time", "Confidence", "Subject"])
    for r in rows:
        w.writerow([r.name, r.roll_no, r.date, r.time, r.confidence, r.subject])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )


@router.get("/stats")
def stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    today      = datetime.now().strftime("%Y-%m-%d")
    total_students = db.query(Student).filter(Student.is_active == True).count()
    present_today  = db.query(func.count(func.distinct(AttendanceRecord.roll_no)))\
                       .filter(AttendanceRecord.date == today).scalar() or 0
    total_records  = db.query(AttendanceRecord).count()
    total_days     = db.query(func.count(func.distinct(AttendanceRecord.date))).scalar() or 0

    return {
        "total_students": total_students,
        "present_today":  present_today,
        "absent_today":   max(0, total_students - present_today),
        "total_records":  total_records,
        "total_days":     total_days,
    }
