# SmartAttend — AI Smart Attendance System
## Complete Setup & Run Guide
**Group A18 · AI-Based Smart Attendance System using Face Recognition & Liveness Detection**

---

## Project Overview

SmartAttend is a full-stack AI attendance system built with:

| Layer | Technology |
|---|---|
| Face Recognition | DeepFace + ArcFace model (512-D embeddings) |
| Liveness Detection | Stable-face presence check (2 seconds continuous) |
| Backend API | FastAPI (Python) + WebSocket |
| Database | SQLite via SQLAlchemy ORM |
| Frontend Dashboard | React 19 + Tailwind CSS + Recharts |
| Real-time Updates | WebSocket (attendance events pushed to dashboard) |
| Authentication | JWT tokens (HS256, 8-hour expiry) |
| Data Augmentation | 4 variants per photo → 5× training samples |

---

## Prerequisites

Install these before anything else:

1. **Python 3.10 or 3.11** — https://python.org
   - During install: ✅ check "Add Python to PATH"
   
2. **Node.js 20+** — https://nodejs.org
   - Choose the LTS version

3. **A webcam** — built-in laptop camera is fine

---

## STEP 1 — Install Python Backend Dependencies

Open a terminal/PowerShell **in the project root** (`smart_attendance/`) and run:

```bash
pip install -r backend/requirements.txt
```

This installs FastAPI, OpenCV, DeepFace (ArcFace), SQLAlchemy, JWT auth, and all other dependencies.

> **If you get a build error on Windows:** Run this first:
> ```bash
> pip install --upgrade pip setuptools wheel
> ```
> Then retry the install.

---

## STEP 2 — Migrate Existing Data (Only needed once, if upgrading)

If you had the old CSV-based system, run this **once** to import data into SQLite:

```bash
python backend/migrate_csv.py
```

This imports:
- All students from the `dataset/` folder
- All attendance records from `attendance.csv`

---

## STEP 3 — Start the Backend Server

Open **Terminal 1** and run:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Database initialised. API ready.
INFO:     Application startup complete.
```

> **Keep this terminal open** — do not close it.

The API documentation is available at: http://localhost:8000/api/docs

---

## STEP 4 — Start the Frontend Dashboard

Open **Terminal 2** (new terminal window) and run:

```bash
cd frontend
npm install      # only needed first time
npm run dev
```

You should see:
```
VITE v8.x.x  ready in 1s
  Local:   http://localhost:5173/
```

> **Keep this terminal open** — do not close it.

---

## STEP 5 — Open the Dashboard

Open your browser and go to: **http://localhost:5173**

Login with default credentials:
- **Username:** `admin`
- **Password:** `admin123`

> Change your password in Settings after first login.

---

## STEP 6 — Enroll Students

1. Click **Enroll Student** in the sidebar
2. Enter the student's full name and roll number
3. Click **Start Enrollment**
4. Allow camera access when the browser asks
5. The system auto-captures 8 photos with different angle prompts
6. **Each photo generates 4 augmented variants** → 40 total training samples per student

Repeat for each student in your group.

---

## STEP 7 — Take Attendance

1. Click **Live Recognition** in the sidebar
2. Select the **subject** from the dropdown
3. Click **Start**
4. Allow camera access
5. Look at the camera and **hold still for 2 seconds**
6. The system verifies liveness, then recognises your face
7. Attendance is **automatically marked and saved**
8. The Dashboard updates in real time

---

## STEP 8 — View Reports

- **Dashboard** — Today's attendance, trend charts, live event feed
- **Reports** — Per-student attendance %, defaulter list, date-range filters, CSV export
- **Attendance Log** — Full paginated history with search and subject filter

---

## Stopping the System

- Press `Ctrl+C` in Terminal 1 (backend) to stop
- Press `Ctrl+C` in Terminal 2 (frontend) to stop

---

## Project Structure

```
smart_attendance/
│
├── HOW_TO_RUN.md               ← You are here
├── README.md                   ← Technical documentation
│
├── dataset/                    ← Face images (auto-managed)
│   ├── Nikhil_Dhore_31/
│   │   ├── Nikhil_Dhore_31_1.jpg      (raw)
│   │   ├── Nikhil_Dhore_31_1_aug1.jpg (brightness +)
│   │   ├── Nikhil_Dhore_31_1_aug2.jpg (brightness -)
│   │   ├── Nikhil_Dhore_31_1_aug3.jpg (flipped)
│   │   └── Nikhil_Dhore_31_1_aug4.jpg (CLAHE enhanced)
│   └── ...
│
├── backend/
│   ├── main.py                 ← FastAPI app entry point
│   ├── config.py               ← All system settings
│   ├── requirements.txt        ← Python packages
│   ├── migrate_csv.py          ← One-time data migration
│   ├── attendance.db           ← SQLite database (auto-created)
│   │
│   ├── api/
│   │   ├── auth.py             ← Login / JWT endpoints
│   │   ├── students.py         ← Student CRUD
│   │   ├── attendance.py       ← Analytics + export
│   │   ├── recognition_ws.py   ← WebSocket recognition engine
│   │   └── enroll.py           ← WebSocket enrollment engine
│   │
│   └── core/
│       ├── database.py         ← SQLAlchemy models
│       ├── auth.py             ← JWT utilities
│       ├── recognition.py      ← DeepFace wrapper + augmentation
│       └── liveness.py         ← Liveness detection
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── DashboardPage.jsx    ← Live stats + charts
    │   │   ├── LivePage.jsx         ← Webcam recognition
    │   │   ├── StudentsPage.jsx     ← Student management
    │   │   ├── EnrollPage.jsx       ← Face enrollment wizard
    │   │   ├── ReportsPage.jsx      ← Analytics + defaulters
    │   │   ├── AttendanceLogPage.jsx← Full attendance history
    │   │   └── SettingsPage.jsx     ← Account + system info
    │   ├── components/
    │   │   ├── Layout.jsx           ← Sidebar + topbar
    │   │   └── StatCard.jsx         ← Reusable stat display
    │   └── lib/api.js               ← Axios API client
    └── package.json
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Camera permission denied" | Click the camera icon in the browser address bar → Allow |
| "Camera busy" | Close Teams, Zoom, or any other app using the webcam |
| "WebSocket connection error" | Make sure the backend is running in Terminal 1 |
| "Face not recognised" | Re-enroll with better lighting; check you are in the dataset |
| DeepFace first run is slow | Normal — downloading ArcFace model (~137 MB) once |
| `pip install` fails | Run as Administrator; try `pip install --upgrade pip` first |
| Port 8000 already in use | Kill the old process: `Get-Process python | Stop-Process -Force` |
| Browser shows old version | Hard refresh: Ctrl+Shift+R |

---

## API Endpoints Reference

All endpoints require `Authorization: Bearer <token>` header (except `/api/auth/token`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/token` | Login, returns JWT token |
| GET | `/api/attendance/stats` | Dashboard statistics |
| GET | `/api/attendance/today` | Today's attendance list |
| GET | `/api/attendance/summary` | Per-student summary + defaulters |
| GET | `/api/attendance/trend` | Daily trend data |
| GET | `/api/attendance/log` | Paginated full log |
| GET | `/api/attendance/export/csv` | Download CSV |
| GET | `/api/students/` | List all students |
| DELETE | `/api/students/{roll_no}` | Remove student |
| WS | `/api/recognize/ws` | Real-time face recognition |
| WS | `/api/enroll/ws` | Face enrollment |
| WS | `/api/recognize/events` | Live dashboard event feed |

Full interactive docs: **http://localhost:8000/api/docs**

---

## For Your Viva / Panel Presentation

**Key talking points:**

1. **ArcFace Model** — Trained on 5.8M images (MS1MV2 dataset). Industry-standard model used in production identity systems. We use it through DeepFace for zero-shot recognition.

2. **Liveness Detection** — Prevents photo/screen spoofing. Requires 2 seconds of continuous face presence. A static photo will NOT mark attendance.

3. **Data Augmentation** — Each enrolled photo generates 4 variants (brightness ±25, horizontal flip, CLAHE equalization). This gives 40 training samples per student from 8 photos, improving accuracy across lighting and angle variations.

4. **Real-time Architecture** — WebSocket-based pipeline processes frames at 10fps. When attendance is marked, it broadcasts instantly to all connected dashboards without page refresh.

5. **Professional ERP Stack** — React + FastAPI + SQLite + JWT Auth. This is the same architecture used in real enterprise attendance systems.

**Demo anti-spoofing to the panel:**
- Open Live Recognition
- Hold a printed photo or phone screen showing your face at the camera
- It will NOT mark attendance — liveness check fails because there is no 2-second stable face detection with a real 3D face

---

## Default Login

| Field | Value |
|---|---|
| URL | http://localhost:5173 |
| Username | admin |
| Password | admin123 |

**Change the password** in Settings → Change Password after first login.
