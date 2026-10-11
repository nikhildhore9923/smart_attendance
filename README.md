# SmartAttend â€” AI-Based Smart Attendance System

**Megaproject | Group A18**
**[👉 Click here for the full Startup Guide (RUNNING_THE_PROJECT.md)](RUNNING_THE_PROJECT.md)**

A full-stack, production-grade attendance system using real-time face recognition, two-stage liveness detection, and a live React dashboard.

---

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  React Frontend  (Vite + Tailwind + Recharts)               â”‚
â”‚  â”œâ”€â”€ Dashboard       (live stats, charts, event feed)       â”‚
â”‚  â”œâ”€â”€ Live Recognition (WebSocket + webcam stream)           â”‚
â”‚  â”œâ”€â”€ Enroll Student  (WebSocket guided capture)             â”‚
â”‚  â”œâ”€â”€ Students        (CRUD management)                      â”‚
â”‚  â”œâ”€â”€ Reports         (analytics, defaulter list, export)    â”‚
â”‚  â””â”€â”€ Attendance Log  (paginated searchable history)         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚  REST + WebSocket
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  FastAPI Backend  (Python 3.10+)                            â”‚
â”‚  â”œâ”€â”€ /api/auth        JWT login                             â”‚
â”‚  â”œâ”€â”€ /api/students    CRUD                                  â”‚
â”‚  â”œâ”€â”€ /api/attendance  Stats, summary, trend, export         â”‚
â”‚  â”œâ”€â”€ /api/recognize/ws   Recognition WebSocket              â”‚
â”‚  â”œâ”€â”€ /api/recognize/events  Live dashboard push             â”‚
â”‚  â””â”€â”€ /api/enroll/ws   Enrollment WebSocket                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  AI Pipeline                                                 â”‚
â”‚  â”œâ”€â”€ OpenCV Haar cascade   â€” face detection                 â”‚
â”‚  â”œâ”€â”€ dlib 68-pt landmarks  â€” EAR computation                â”‚
â”‚  â”œâ”€â”€ LivenessChecker       â€” blink (EAR) + head-pose       â”‚
â”‚  â””â”€â”€ DeepFace ArcFace      â€” face recognition               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  SQLite (attendance.db)                                      â”‚
â”‚  â”œâ”€â”€ students              enrolled student profiles        â”‚
â”‚  â”œâ”€â”€ attendance_records    time-stamped logs + confidence   â”‚
â”‚  â”œâ”€â”€ faculty_users         JWT auth accounts                â”‚
â”‚  â””â”€â”€ system_logs           audit trail                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Quick Start

### 1. Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

### 2. Migrate existing data (if upgrading from old version)

```bash
python backend/migrate_csv.py
```

### 3. Start the backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
> API docs available at http://localhost:8000/api/docs

### 4. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```
> Dashboard at http://localhost:5173

### 5. Login

Default credentials: `admin` / `admin123`
*(Change immediately via Settings after first login)*

---

## Usage

### Enroll a Student
1. Go to **Enroll Student** in the sidebar
2. Enter name + roll number
3. Webcam opens â€” auto-captures 8 photos with angle prompts
4. Done â€” student is immediately available for recognition

### Take Attendance
1. Go to **Live Recognition**
2. Click **Start**
3. Student looks at camera â†’ blinks twice â†’ turns head
4. System recognises and marks attendance instantly
5. Dashboard **Live Feed** updates in real time

### View Reports
- **Dashboard**: today's stats, trend chart, live event feed
- **Reports**: per-student attendance %, defaulters, date-range filters, CSV export
- **Attendance Log**: full paginated history with search

---

## Anti-Spoofing (Liveness Detection)

Two mandatory stages before recognition:

| Stage | Method | Description |
|-------|--------|-------------|
| 1 | EAR Blink Detection | Eye Aspect Ratio via dlib 68-point facial landmarks. Detects genuine openâ†’closedâ†’open blink pattern. Threshold: EAR < 0.25 for â‰¥2 frames = closed. Requires 2 blinks. |
| 2 | Head-Pose Challenge | Random left/right head-turn challenge. Yaw estimated from nose landmark offset. Must turn â‰¥15Â° within 10 seconds. |

A printed photo or phone screen held to the camera will **not** pass liveness â€” no blink, no attendance.

---

## Face Recognition Pipeline

```
Frame â†’ Haar Cascade â†’ Face ROI â†’ DeepFace.find()
                                     â†“
                               ArcFace embeddings
                                     â†“
                           Cosine distance < 0.45
                                     â†“
                              Student identity + confidence %
```

- Model: **ArcFace** (state-of-the-art, used in production identity systems)
- Metric: Cosine distance (lower = more similar)
- Threshold: 0.45 (tunable in `backend/config.py`)
- Cooldown: 5 seconds per student (prevents double-marking)

---

## Project Structure

```
smart_attendance/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ main.py                  FastAPI app entry point
â”‚   â”œâ”€â”€ config.py                All tunable parameters
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â”œâ”€â”€ migrate_csv.py           One-time CSV â†’ SQLite migration
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ auth.py              JWT login endpoints
â”‚   â”‚   â”œâ”€â”€ students.py          Student CRUD
â”‚   â”‚   â”œâ”€â”€ attendance.py        Analytics + export
â”‚   â”‚   â”œâ”€â”€ recognition_ws.py    WebSocket recognition engine
â”‚   â”‚   â””â”€â”€ enroll.py            WebSocket enrollment
â”‚   â””â”€â”€ core/
â”‚       â”œâ”€â”€ database.py          SQLAlchemy models + SQLite
â”‚       â”œâ”€â”€ auth.py              JWT utilities
â”‚       â”œâ”€â”€ liveness.py          EAR + head-pose liveness
â”‚       â””â”€â”€ recognition.py       DeepFace wrapper
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ pages/               React page components
â”‚   â”‚   â”œâ”€â”€ components/          Shared UI components
â”‚   â”‚   â”œâ”€â”€ context/             Auth state (React Context)
â”‚   â”‚   â””â”€â”€ lib/api.js           Axios API client
â”‚   â”œâ”€â”€ vite.config.js
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ dataset/                     Face image store (auto-created)
â””â”€â”€ README.md
```

---

## For the Viva Panel

| Synopsis Module | Implementation |
|----------------|---------------|
| Face Detection | OpenCV Haar cascade (`haarcascade_frontalface_default.xml`) |
| Liveness Detection | EAR blink (Soukupova & Cech, 2016) + head-pose challenge |
| Face Recognition | DeepFace ArcFace model, cosine similarity |
| Database Module | SQLite via SQLAlchemy ORM â€” students, records, users |
| Report Generation | FastAPI `/api/attendance/export/csv` endpoint |
| Analytics Dashboard | React SPA â€” live WebSocket feed, Recharts visualisations |
| Anti-Spoofing | Two-stage: passive blink + active head-turn challenge |
| Authentication | JWT tokens (HS256), bcrypt password hashing |
| Real-time Updates | WebSocket push â€” marks appear on dashboard instantly |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Camera error" in browser | Allow camera permission in browser settings |
| DeepFace first run slow | Normal â€” downloads ArcFace weights (~137 MB) once |
| Face not recognised | Re-enroll with better lighting; face must be enrolled first |
| WebSocket disconnects | Ensure `uvicorn` is running on port 8000 |
| `dlib` install fails | Run: `pip install cmake` first, then retry |
