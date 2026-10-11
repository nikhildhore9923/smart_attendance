# PROJECT DEMO CHECKLIST & SCRIPT
**SmartAttend Live Demonstration Runbook | Review – II Presentation (13 October 2026)**  
**Group A18 | Dept. of CSE-AIML | KIT’s College of Engineering (Autonomous), Kolhapur**

---

## ⚡ Pre-Demo Setup & Startup Sequence

### Step 1: Verify Services Before Entering the Presentation Room
Make sure MySQL 8 is running locally on port 3306.

#### Option A: One-Click Startup (Recommended for Windows)
1. Double-click `start_smart_attend.bat` in the project root directory (`c:\smart_attendance`).
2. The script will automatically:
   - Check MySQL on port 3306.
   - Launch AI Service (`uvicorn`) on `http://localhost:8000`.
   - Launch Node.js Backend on `http://localhost:5000`.
   - Launch React Frontend on `http://localhost:5173`.
   - Open your default browser to `http://localhost:5173`.

#### Option B: Manual Terminal Startup
If starting manually, open three separate terminal windows:
```powershell
# Terminal 1: AI Service
cd c:\smart_attendance\ai-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Core Backend
cd c:\smart_attendance\backend
node src/server.js

# Terminal 3: React Frontend
cd c:\smart_attendance\frontend
npm run dev
```

---

## 🔑 Login Credentials Reference

| Role | Email Address | Password | Permissions & Scope |
|---|---|---|---|
| **Administrator** | `admin@college.edu` | `password123` | Full system access: Academic setup, faculty management, all divisions, all reports. |
| **Teaching Faculty** | `faculty@college.edu` | `password123` | Operational access: Live attendance for assigned subjects, student directory, scoped reports. |

---

## 🎬 7-Minute Live Demo Flow

### 1. Introduction & Dashboard Health (Admin Login) — 1 Minute
* **Action:** Open `http://localhost:5173/login`. Log in with `admin@college.edu` / `password123`.
* **What to Show:**
  * Point out the **Institution Dashboard**: Total Students (4), Total Faculty (18), Active Classes (18), Total Subjects (88).
  * Point out the **System Status Badge** in the top-right header: `AI Service: Online` and `Socket: Connected`.
  * Highlight the 7-day attendance percentage trend line chart rendered via Recharts.
* **Speaking Point:** *"We have developed a decoupled three-tier architecture where the core ERP runs on Node.js and Express, while computer vision pipelines run on a dedicated Python FastAPI service."*

### 2. Academic Taxonomy & Faculty Course Allocation — 1.5 Minutes
* **Action:** Click **Academic Setup** (`/classes`) in the sidebar.
  * Show the 4-tier hierarchy: Programs $\rightarrow$ Semesters $\rightarrow$ Divisions $\rightarrow$ Subjects.
* **Action:** Click **Faculty & Allocation** (`/faculty`).
  * Show the faculty directory.
  * Click **Allocate Courses** next to a faculty member (e.g., Ms. Vajreshwari Kulal).
  * Show the course selection checkboxes linking faculty directly to subjects and divisions.
* **Speaking Point:** *"In a real institution, attendance must be strictly governed by course allocations. Admins can assign specific subjects to specific faculty members, enforcing institutional boundaries."*

### 3. Student Roster & Scoped Biometric Enrollment — 1.5 Minutes
* **Action:** Click **All Students** (`/students`).
  * Filter by Division: Select `B.Tech AIML-B`.
  * Show that student counts and KPI cards strictly scope to the chosen division.
* **Action:** Click **Enroll Student** (`/enroll`).
  * Select an unenrolled student or click **Register New Student**.
  * Click **Start Biometric Enrollment**.
  * Webcam feed opens: demonstrate the **5-step guided capture sequence** (Straight, Left, Right, Up, Down).
  * Show the real-time quality validation: Laplacian variance filter rejects blurry or dark frames.
  * Show that 5 normalized ArcFace 512-dimensional vector embeddings are stored in MySQL.
* **Speaking Point:** *"Instead of capturing a single flat photo, our enrollment collects 5 multi-angle samples with real-time blur and lighting checks, ensuring high intra-class feature coverage."*

### 4. Role Transition to Teaching Faculty — 30 Seconds
* **Action:** Click the bottom-left sidebar user card $\rightarrow$ Click **Logout**.
* **Action:** Log in as `faculty@college.edu` (`password123`).
* **What to Show:**
  * Academic Setup and Faculty Allocation options disappear from the sidebar, demonstrating strict **Role-Based Access Control**.
* **Speaking Point:** *"Notice how the navigation automatically adapts. Teaching faculty only see modules relevant to their instructional duties."*

### 5. Live Attendance & Anti-Spoofing Verification — 1.5 Minutes
* **Action:** Click **Live Recognition** (`/live`).
  * Select allocated course: e.g., *Generative AI*.
  * Click **Start Attendance Session**.
  * **Test Case A (Genuine Student):** Stand in front of the camera.
    * MTCNN detects face $\rightarrow$ EfficientNetB0 confirms liveness $\rightarrow$ ArcFace extracts embedding.
    * The 3-consecutive-frame temporal counter increments $\rightarrow$ Socket.io emits live event $\rightarrow$ Student name appears with green badge and success sound/toast.
  * **Test Case B (Spoof Attempt):** Hold up a smartphone screen displaying a photo of an enrolled student.
    * The AI engine flags spoof reflection / quality variance $\rightarrow$ System rejects mark $\rightarrow$ Warning indicator displayed.
  * **Test Case C (Duplicate Prevention):** Continue standing in front of camera.
    * System displays `Already marked present` and ignores re-insertion due to MySQL composite unique constraint `@@unique([sessionId, studentId])`.
  * Click **End Session** $\rightarrow$ Show custom glassmorphic `<ConfirmModal />`.
* **Speaking Point:** *"Our system enforces a 3-layer security defense: deep EfficientNetB0 anti-spoofing, image quality filtering, and a 3-frame temporal stability rule combined with database unique constraints."*

### 6. Reports, Division Matrix & Official Exports — 1 Minute
* **Action:** Click **Reports** (`/reports`).
  * View the **Division Attendance Matrix**: show the complete grid displaying student-wise percentages across all division subjects.
  * Highlight the **Defaulter Warning Banner** automatically flagging students below $75\%$.
  * Click **Export CSV** $\rightarrow$ Show the downloaded spreadsheet.
  * Click **Export PDF** $\rightarrow$ Open the generated official attendance report.
* **Speaking Point:** *"Faculty and administrators no longer need to manually calculate attendance percentages. The division matrix aggregates all sessions automatically, identifies defaulters, and generates one-click CSV and PDF reports for departmental files."*

### 7. Profile Hub & Architecture Diagnostics — 30 Seconds
* **Action:** Click the bottom-left sidebar user card $\rightarrow$ Navigates to **Settings & Profile** (`/settings`).
  * Show faculty allocated teaching assignments.
  * Show live biometric architecture specs: FaceNet/ArcFace 512-D, Cosine Similarity metric ($0.50$), 3-frame temporal stability rule.
  * Toggle theme between Obsidian Midnight Dark and Slate-50 Light mode.

---

## ⚠️ Live Demo Troubleshooting Cheat Sheet

| Potential Issue | Immediate Quick Fix |
|---|---|
| **Camera not opening in browser** | Check browser permissions: click the lock icon $\rightarrow$ Camera $\rightarrow$ Allow. Reload page. |
| **"AI Service Offline" badge on dashboard** | Open `http://localhost:8000/docs` in a new tab. If down, run `python -m uvicorn app.main:app --port 8000` in `ai-service/`. |
| **"Server listening on port 5000" not responding** | Verify Node server in Terminal 2. If port is busy, run `npx kill-port 5000` and restart `node src/server.js`. |
| **Face detected but says "Unknown Face"** | Check lighting; ensure face is within normal bounding box and student has been enrolled via `/enroll`. |
| **Modal doesn't close on click** | Click the Backdrop or press `Esc`. |
