"""
One-time migration: imports attendance.csv + dataset/ folders into SQLite.
Run once: python backend/migrate_csv.py
"""
import os, csv, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.database import init_db, SessionLocal, Student, AttendanceRecord

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH    = os.path.join(ROOT, "attendance.csv")
DATASET_DIR = os.path.join(ROOT, "dataset")

def run():
    init_db()
    db = SessionLocal()

    # 1. Import students from dataset/ folders
    if os.path.isdir(DATASET_DIR):
        for folder in sorted(os.listdir(DATASET_DIR)):
            path = os.path.join(DATASET_DIR, folder)
            if not os.path.isdir(path):
                continue
            try:
                parts    = folder.rsplit("_", 1)
                roll_no  = parts[-1]
                name     = parts[0].replace("_", " ") if len(parts) == 2 else folder
                photos   = len([f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.png'))])
                existing = db.query(Student).filter(Student.roll_no == roll_no).first()
                if not existing:
                    db.add(Student(name=name, roll_no=roll_no, folder_name=folder, photo_count=photos))
                    print(f"  + Student: {name} (Roll {roll_no}) — {photos} photos")
            except Exception as e:
                print(f"  ! Skipping {folder}: {e}")

    db.commit()

    # 2. Import attendance records from CSV
    if os.path.isfile(CSV_PATH):
        students_map = {s.roll_no: s for s in db.query(Student).all()}
        imported = 0
        with open(CSV_PATH, newline="") as f:
            for row in csv.DictReader(f):
                roll_no = str(row.get("RollNo", "")).strip()
                date    = str(row.get("Date", "")).strip()
                time    = str(row.get("Time", "")).strip()
                name    = str(row.get("Name", "")).strip()
                if not roll_no or not date:
                    continue
                exists = db.query(AttendanceRecord).filter(
                    AttendanceRecord.roll_no == roll_no,
                    AttendanceRecord.date    == date,
                ).first()
                if not exists:
                    s = students_map.get(roll_no)
                    rec = AttendanceRecord(
                        roll_no=roll_no, name=name, date=date, time=time,
                        confidence=0.0, subject="General",
                        student_id=s.id if s else None,
                    )
                    db.add(rec)
                    imported += 1

        db.commit()
        print(f"  + Imported {imported} attendance records from CSV")
    else:
        print("  No attendance.csv found — skipping")

    db.close()
    print("\nMigration complete.")

if __name__ == "__main__":
    run()
