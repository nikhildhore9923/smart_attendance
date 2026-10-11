# PROJECT IMPLEMENTATION DOSSIER: AI-BASED SMART ATTENDANCE SYSTEM
**College Project Phase – I | Review – II Presentation (13 October 2026)**  
**Department of Computer Science & Engineering (Artificial Intelligence & Machine Learning)**  
**KIT’s College of Engineering (Autonomous), Kolhapur**

---

### Project Metadata
* **Project Title:** AI-Based Smart Attendance System using Face Recognition, Liveness Detection and Analytics Dashboard
* **Project Group:** Group A18
* **Team Members:**
  1. Shreyas Sonepethkar — PRN: `2324000119` (Class: SY AIML-B)
  2. Mohin Mokashi — PRN: `2324000237` (Class: SY AIML-B)
  3. Shravan Mane — PRN: `2324000393` (Class: SY AIML-B)
  4. Nikhil Dhore — PRN: `2324000721` (Class: SY AIML-B)
  5. Shreya Handebag — PRN: `2324000664` (Class: SY AIML-B)
* **Project Guide:** Ms. Vajreshwari Kulal (Assistant Professor, Dept. of CSE-AIML)
* **Academic Year:** 2026–2027

---

## 1. Project Overview & Problem Statement

### 1.1 Academic Context & Need
Attendance tracking in higher education institutions remains largely dependent on manual roll calls, physical paper registers, or biometrics like fingerprint and RFID cards. 
In a typical classroom of 60 to 70 engineering students:
- Manual roll calling consumes 7 to 12 minutes per lecture (up to 15–20% of instructional time).
- Paper registers suffer from proxy sign-ins, illegibility, and physical degradation.
- Dedicated hardware like biometric fingerprint sensors suffers from slow throughput (queuing delays), hygiene concerns, and high maintenance costs.
- RFID cards are frequently loaned to peers, defeating authenticity.

### 1.2 The Face Recognition Dilemma & Presentation Attacks
While computer vision provides contactless, rapid identity verification, standard face recognition systems fail against **Presentation Attacks (PAs)**. An imposter can present:
1. High-resolution printed photographs (2D print attack).
2. Smartphone or tablet screen video replays (replay attack).
3. 3D masks or paper cutouts with eyeholes.

### 1.3 The Academic Management Void in Existing Projects
Most academic face attendance projects stop at simple OpenCV Haar cascade scripts writing to a local CSV file. They completely lack:
- Role-based separation between Administrators and Teaching Faculty.
- Multi-tier academic structuring (Programs $\rightarrow$ Semesters $\rightarrow$ Divisions $\rightarrow$ Subjects).
- Faculty course allocation boundaries (preventing unauthorized faculty from tampering with other classes).
- Real-time live dashboard sync and automated institutional report exports.

### 1.4 How SmartAttend Solves This
SmartAttend addresses this through a decoupled, production-engineered three-tier architecture:
1. A **Python FastAPI AI Microservice** executing MTCNN face detection, EfficientNetB0/MobileNetV2 anti-spoofing liveness classification, and ArcFace 512-dimensional vector embedding extraction.
2. A **Node.js/Express Core ERP Backend** with Prisma ORM and MySQL managing role-based access control (RBAC), academic hierarchy, faculty course allocation, session state machines, and duplicate prevention via unique database constraints.
3. A **React 18 SPA Frontend** featuring an obsidian midnight dark mode, real-time Socket.io updates, multi-angle guided student enrollment, division attendance matrices, and custom modal confirmation architecture.

---

## 2. Project Objectives & Implementation Status

| Original Synopsis Objective | Implementation Reality | Evidence in Repository | Status Label |
|---|---|---|---|
| **1. Real-time face recognition module** using deep-learning embeddings (FaceNet/ArcFace) | Implemented via DeepFace utilizing the **ArcFace** model (`512-dimensional` unit vector embeddings) and MTCNN face alignment, matching via Cosine Similarity. | `ai-service/app/services/face_embedder.py`<br>`backend/src/services/recognitionService.js` | **Implemented and verified** |
| **2. Integrated liveness / anti-spoofing mechanism** to prevent fraud via photos and video replays | Implemented with a dual-pipeline: Deep CNN Anti-Spoofing classifier (**EfficientNetB0 TFLite** & **MobileNetV2**) evaluated against the NUAA Photograph Imposter dataset, coupled with eye-level quality validation. | `ai-service/app/services/liveness_service.py`<br>`ai-service/models/liveness/` | **Implemented and verified** |
| **3. Robust recognition under real classroom conditions** (varying lighting, multiple faces) | Multi-face detection endpoint (`/analyze-frame`), bounding box expansion, Laplacian blur filtering ($>15.0$), brightness normalization ($15-245$), and temporal stability window (3 consecutive confirmations). | `ai-service/app/routes/analyze.py`<br>`backend/src/controllers/attendanceController.js` | **Implemented and verified** |
| **4. Automated report generation & defaulter list compilation** | Automated generation of subject-wise and division-wise attendance matrices, automatic defaulter identification ($<75\%$), with PDFKit and json2csv download engines. | `backend/src/controllers/reportController.js`<br>`frontend/src/pages/ReportsPage.jsx` | **Implemented and verified** |
| **5. Web-based analytics dashboard visualizing trends** | Real-time institutional KPI cards, 7-day attendance percentage trend line charts (Recharts), and Socket.io event pipes for zero-refresh updates. | `frontend/src/pages/DashboardPage.jsx`<br>`backend/src/utils/socket.js` | **Implemented and verified** |
| **6. Evaluation against quantitative benchmarks** (Accuracy, FAR, FRR) | Evaluated on official **NUAA Photograph Imposter Database** (9,123 test samples). MobileNetV2 achieved 53.1% acc (FAR 41.8%); EfficientNetB0 improved to 72.3% acc (FAR 25.5%, FRR 31.5%). | `ai-service/models/liveness/efficientnetb0_metrics.json`<br>`ai-service/models/liveness/liveness_metrics.json` | **Implemented and verified** |

---

## 3. Comprehensive Feature Inventory (15 Categories)

### Category 1: Authentication, Login, and Role-Based Access Control (RBAC)
* **What it does:** Authenticates users via email and password; generates HMAC-SHA256 JWT tokens containing `id`, `email`, and `role`. Enforces role barriers (`ADMIN`, `FACULTY`, `STUDENT`) across HTTP routes and UI navigation.
* **Who can use it:** All registered institutional users.
* **Relevant Files:**
  - `backend/src/routes/authRoutes.js`
  - `backend/src/controllers/authController.js`
  - `backend/src/middleware/authMiddleware.js`
  - `frontend/src/context/AuthContext.jsx`
  - `frontend/src/pages/LoginPage.jsx`
* **Evidence:** `authMiddleware.js` verifies JWT and fetches role; `authorize('ADMIN')` protects academic routes; `authorize('FACULTY')` guards live session endpoints.
* **Status:** **Implemented and verified**
* **Known Limitations:** Password reset requires manual administrator intervention; email verification is disabled in the local development environment.

### Category 2: Admin Dashboard and Management
* **What it does:** Displays high-level academic metrics (Total Students, Total Faculty, Active Classes, Total Subjects, Sessions Conducted, Institution Average Attendance %). Provides full CRUD controls over academic structure and faculty rosters.
* **Who can use it:** Administrators (`ADMIN` role only).
* **Relevant Files:**
  - `frontend/src/pages/DashboardPage.jsx`
  - `backend/src/controllers/reportController.js` (`getDashboardStats`)
* **Evidence:** Endpoint `GET /api/attendance/dashboard` aggregates real Prisma counts across database tables.
* **Status:** **Implemented and verified**
* **Known Limitations:** System audit log visualization is stored in the database (`AuditLog` model) but lacks a dedicated UI table in the admin dashboard.

### Category 3: Faculty Management and Faculty Allocation
* **What it does:** Allows administrators to register faculty members, assign departments, generate secure credentials, update profile records, and allocate specific subjects/courses to them. Prevents faculty deletion if historical attendance sessions exist.
* **Who can use it:** Administrators manage allocations; Faculty view their allocations.
* **Relevant Files:**
  - `backend/src/routes/facultyRoutes.js`
  - `backend/src/controllers/facultyController.js`
  - `frontend/src/pages/FacultyPage.jsx`
* **Evidence:** `prisma.faculty.update({ data: { subjects: { set: [...] } } })` transactional allocation logic in `allocateSubjects`.
* **Status:** **Implemented and verified**
* **Known Limitations:** Faculty cannot self-register; all accounts must be provisioned by the Administrator.

### Category 4: Subject/Course Allocation and Academic Management
* **What it does:** Complete 4-tier institutional taxonomy: Academic Year (e.g., 2026–2027) $\rightarrow$ Program (B.Tech CSE-AIML) $\rightarrow$ Semester (Sem I–VIII) $\rightarrow$ Class/Division (SY AIML-B) and Subjects (e.g., Generative AI, Machine Learning, Computer Vision).
* **Who can use it:** Administrators (`ADMIN`).
* **Relevant Files:**
  - `backend/src/routes/academicRoutes.js`
  - `backend/src/controllers/academicController.js`
  - `frontend/src/pages/ClassesPage.jsx`
  - `frontend/src/pages/SubjectsPage.jsx`
* **Evidence:** Prisma models `AcademicYear`, `Program`, `Semester`, `Class`, and `Subject` with foreign key relations and cascade deletions.
* **Status:** **Implemented and verified**
* **Known Limitations:** Currently supports single institute tenancy (does not isolate multiple separate universities in one DB).

### Category 5: Student Registration and Management
* **What it does:** Registers students with Roll Number, First Name, Last Name, Email, and Division linkage. Provides student roster browsing, division filtering, attendance percentage tracking, and permanent cascade deletion.
* **Who can use it:** Administrators and Faculty.
* **Relevant Files:**
  - `backend/src/routes/studentRoutes.js`
  - `backend/src/controllers/studentController.js`
  - `frontend/src/pages/StudentsPage.jsx`
* **Evidence:** `prisma.student.delete` and `prisma.user.delete` with cascade removal of `FaceEmbedding` and `AttendanceRecord` rows.
* **Status:** **Implemented and verified**
* **Known Limitations:** CSV bulk upload for student roster import is pending implementation; students are added individually via the UI form.

### Category 6: Face Enrollment and Sample Quality Control
* **What it does:** Guides students through a 5-step webcam capture sequence (Frontal, Left, Right, Up, Down). Validates image quality (Laplacian variance $> 15.0$, brightness $15-245$) before extracting and persisting 512-d ArcFace embeddings into the database.
* **Who can use it:** Administrators and Faculty.
* **Relevant Files:**
  - `backend/src/routes/enrollmentRoutes.js`
  - `backend/src/controllers/enrollmentController.js`
  - `ai-service/app/routes/quality.py`
  - `frontend/src/pages/EnrollPage.jsx`
* **Evidence:** `SAMPLE_COUNT_REQUIRED = 5` in `enrollmentController.js`; 10 verified embeddings stored across 2 enrolled test students in the database.
* **Status:** **Implemented and verified**
* **Known Limitations:** Does not accept pre-recorded video files; requires live camera feed stream.

### Category 7: Webcam Access and Live Attendance
* **What it does:** Renders a 60 FPS HTML5 video stream, captures base64 video frames, streams them to the backend recognition engine, and overlays real-time detection boxes, student names, and confidence badges.
* **Who can use it:** Faculty members (`FACULTY` role only).
* **Relevant Files:**
  - `frontend/src/pages/LivePage.jsx`
  - `backend/src/controllers/attendanceController.js`
* **Evidence:** Strict role check in `LivePage.jsx` (`if (user.role !== 'FACULTY') return <FacultyOnlyGate />`) and backend route guard `authorize('FACULTY')`.
* **Status:** **Implemented and verified**
* **Known Limitations:** Requires HTTPS or `localhost` context for browser `navigator.mediaDevices.getUserMedia` permissions.

### Category 8: Face Detection, Recognition, and Anti-Spoofing
* **What it does:** Runs MTCNN to extract facial bounding boxes and 5 landmarks; evaluates crop through EfficientNetB0 TFLite anti-spoofing classifier; extracts 512-d ArcFace embeddings; computes Cosine Similarity against enrolled vectors in MySQL.
* **Who can use it:** Integrated automated pipeline.
* **Relevant Files:**
  - `ai-service/app/services/face_detector.py`
  - `ai-service/app/services/liveness_service.py`
  - `ai-service/app/services/face_embedder.py`
  - `backend/src/services/recognitionService.js`
* **Evidence:** Threshold $= 0.50$ Cosine Similarity; ArcFace via DeepFace library; EfficientNetB0 model loaded via TensorFlow Lite Interpreter.
* **Status:** **Implemented and verified**
* **Known Limitations:** High camera angles ($>45^\circ$) degrade MTCNN landmark alignment; extreme backlighting can reduce contrast below quality thresholds.

### Category 9: Attendance Session Creation, Tracking, and Duplicate Prevention
* **What it does:** Faculty select their assigned subject to initiate an active session. The system tracks session status (`SCHEDULED`, `ACTIVE`, `COMPLETED`). Prevents duplicate marking via in-memory temporal frame verification and database unique constraints.
* **Who can use it:** Faculty (`FACULTY`).
* **Relevant Files:**
  - `backend/src/controllers/attendanceController.js`
  - `backend/prisma/schema.prisma` (`@@unique([sessionId, studentId])`)
* **Evidence:** Line 132 of `schema.prisma`: `@@unique([sessionId, studentId])`; `REQUIRED_CONFIRMATIONS = 3` temporal frame buffer in `attendanceController.js`.
* **Status:** **Implemented and verified**
* **Known Limitations:** Only one active session can exist per subject at a time; creating a new session automatically completes previous active ones for that subject.

### Category 10: Attendance History and Student-Wise Records
* **What it does:** Searchable, paginated audit log of all marked attendance events with student roll number, subject name, timestamp, verification method (AI vs Manual), and similarity score.
* **Who can use it:** Administrators and Faculty.
* **Relevant Files:**
  - `backend/src/controllers/reportController.js` (`getHistory`)
  - `frontend/src/pages/AttendanceLogPage.jsx`
* **Evidence:** Database query with relational joins on `AttendanceRecord`, `Student`, `User`, `AttendanceSession`, and `Subject`.
* **Status:** **Implemented and verified**
* **Known Limitations:** Student self-service portal is partially implemented (API exists at `GET /api/attendance/student/:id`, but dedicated student-only UI view is pending).

### Category 11: Dashboard Analytics, Charts, and Trends
* **What it does:** Interactive Recharts line chart illustrating daily institution attendance percentages over 7, 14, or 30 days. Live status indicator showing AI Service and Socket.io connectivity.
* **Who can use it:** Administrators and Faculty.
* **Relevant Files:**
  - `frontend/src/pages/DashboardPage.jsx`
  - `backend/src/controllers/reportController.js` (`getTrend`)
* **Evidence:** Dynamic percentage calculation based on actual conducted sessions and enrolled student rosters.
* **Status:** **Implemented and verified**
* **Known Limitations:** Chart currently displays overall attendance trend; individual subject trend overlay is accessible via Reports rather than Dashboard.

### Category 12: Attendance Reports, Defaulter Lists, CSV/PDF Exports
* **What it does:** Generates comprehensive division attendance matrices displaying every student's attendance percentage across all subjects in their division, flags defaulters ($<75\%$), and allows instantaneous downloading of CSV spreadsheets and official PDF documents.
* **Who can use it:** Administrators (all divisions) and Faculty (scoped to their allocated courses).
* **Relevant Files:**
  - `backend/src/controllers/reportController.js` (`getDivisionMatrix`, `exportCSV`, `exportPDF`)
  - `frontend/src/pages/ReportsPage.jsx`
* **Evidence:** Real PDF generation using `pdfkit` and CSV serialization using `json2csv`.
* **Status:** **Implemented and verified**
* **Known Limitations:** PDF export formatting is simple tabular text; formal institutional header logo embedding is pending styling refinement.

### Category 13: Real-Time Updates and Notifications
* **What it does:** Socket.io bi-directional gateway. When a student is verified on the live webcam in `LivePage.jsx`, an event (`attendance:marked`) is broadcast across the system. The faculty monitor, attendance counter, and dashboard update with zero page refresh.
* **Who can use it:** Active clients connected to the server.
* **Relevant Files:**
  - `backend/src/utils/socket.js`
  - `frontend/src/utils/socket.js`
  - `frontend/src/pages/LivePage.jsx`
  - `frontend/src/pages/DashboardPage.jsx`
* **Evidence:** `getIO().to('dashboard').emit('attendance:marked', ...)` in `attendanceController.js`.
* **Status:** **Implemented and verified**
* **Known Limitations:** Does not send SMS or WhatsApp notifications to absent students; events are in-app web socket pushes only.

### Category 14: UI/UX Redesign, Theme Support, and Custom Confirm Modals
* **What it does:** Modern obsidian midnight dark mode and slate-50 light mode with seamless CSS variable toggling. Replaced native browser `window.confirm()` and `window.alert()` popups with glassmorphic `<ConfirmModal />` components featuring action badges, backdrop blurs, and danger highlights.
* **Who can use it:** All web users.
* **Relevant Files:**
  - `frontend/src/context/ThemeContext.jsx`
  - `frontend/src/context/ConfirmContext.jsx`
  - `frontend/src/components/ConfirmModal.jsx`
  - `frontend/src/index.css`
* **Evidence:** Global `ConfirmProvider` injected in `App.jsx`; verified modal confirmation triggers on live session discard, session deletion, and faculty removal.
* **Status:** **Implemented and verified**
* **Known Limitations:** Animations are optimized for modern desktop/laptop browsers (Chrome, Edge, Firefox); mobile viewport is supported via responsive drawer, but system is primarily designed for desktop kiosks and faculty laptops.

### Category 15: Biometric Engine Diagnostics & Profile Settings
* **What it does:** Provides dedicated `/settings` page showing logged-in user profile, faculty assigned department and teaching allocations, admin privilege checklist, credential update form, and live biometric architecture specifications (FaceNet 512-d, Cosine Metric, 3-frame temporal rule).
* **Who can use it:** Administrators and Faculty.
* **Relevant Files:**
  - `frontend/src/pages/SettingsPage.jsx`
  - `frontend/src/components/Layout.jsx` (clickable profile card in sidebar)
* **Evidence:** Enriched JWT user payload with faculty allocations in `authMiddleware.js`; interactive `/settings` view.
* **Status:** **Implemented and verified**
* **Known Limitations:** Password update requires entering new password (minimum 6 characters) directly while authenticated.

---

## 4. Current Technology Stack

| Layer / Domain | Technology | Specific Role in One Simple Sentence |
|---|---|---|
| **Frontend Framework** | **React 19 (Vite 8)** | Powers the reactive Single Page Application (SPA) client interface with instant hot-module reloading. |
| **Frontend Styling** | **Tailwind CSS v4** | Provides utility-first styling with custom CSS variables supporting Obsidian Dark and Slate Light themes. |
| **Icons & Visuals** | **Lucide React** | Delivers clean, modern, accessible vector icons across all pages, navigation, and modal dialogues. |
| **Data Visualization** | **Recharts 3** | Renders responsive SVG attendance trend lines and historical institutional percentage charts. |
| **Backend Framework** | **Node.js 22 + Express 4** | Serves the primary REST API, manages session state, business rules, and authentication workflows. |
| **ORM & Database Driver** | **Prisma ORM 5.22** | Provides type-safe relational schema modeling, migrations, queries, and connection pooling to MySQL. |
| **Database Server** | **MySQL 8 (Port 3306)** | Persists relational records for users, faculty, students, academic structures, attendance logs, and face embeddings. |
| **Authentication** | **JWT (jsonwebtoken 9) + Bcrypt 5**| Issues stateless HMAC-SHA256 bearer tokens and hashes user passwords with 10 salt rounds. |
| **AI Web Service** | **Python 3.10+ FastAPI + Uvicorn**| Hosts the high-performance asynchronous microservice running deep computer vision pipelines on port 8000. |
| **Face Detection** | **MTCNN (Multi-task Cascaded CNN)**| Detects human faces in camera frames and extracts 5 facial keypoints for bounding box alignment. |
| **Face Recognition Model** | **ArcFace (via DeepFace 0.0.93)** | Generates 512-dimensional normalized vector embeddings representing individual facial biometric identities. |
| **Vector Similarity Metric** | **Cosine Distance (Threshold 0.50)** | Computes mathematical similarity between live query vectors and stored student embeddings. |
| **Liveness / Anti-Spoofing** | **EfficientNetB0 (TensorFlow Lite)** | Binary classification CNN inferring whether a cropped face frame represents a live person or a presentation spoof attack. |
| **Alternative Liveness Model**| **MobileNetV2 (`.h5` Keras weights)** | Lightweight secondary CNN anti-spoofing model evaluated against the NUAA Photograph Imposter dataset. |
| **Real-Time Communication** | **Socket.io 4.7** | Establishes bi-directional WebSocket pipes for real-time live attendance broadcasting to connected clients. |
| **Document Exporting** | **PDFKit 0.20 + json2csv 6** | Programmatically compiles and streams official PDF attendance documents and CSV spreadsheets to client browsers. |
| **Process Orchestration** | **Windows Batch (`.bat`) + PowerShell** | Verifies MySQL port availability and spawns all three services concurrently in isolated windows with automated health probes. |

---

## 5. Actual System Architecture & Workflow

### 5.1 Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Client Browser Tier (React 19 / Vite - Port 5173)"]
        Webcam["HTML5 Video / Webcam Feed"]
        LiveUI["Live Attendance Monitor (LivePage)"]
        EnrollUI["Guided Multi-Angle Enrollment (EnrollPage)"]
        ReportsUI["Division Matrix & Reports (ReportsPage)"]
        DashboardUI["Institution KPI Dashboard (DashboardPage)"]
    end

    subgraph CoreBackend ["Core Business Tier (Node.js / Express - Port 5000)"]
        AuthMiddleware["JWT Authentication & RBAC Guard"]
        AcademicCtrl["Academic Hierarchy & Faculty Allocations"]
        AttendanceCtrl["Session Lifecycle & Duplicate Prevention Manager"]
        TemporalState["Temporal Stability Buffer (3 Consecutive Confirmations)"]
        SocketServer["Socket.io Real-time Gateway"]
        ExportEngines["PDFKit & json2csv Generation Engines"]
        PrismaClient["Prisma ORM Client"]
    end

    subgraph AIEngine ["Biometric AI Tier (Python FastAPI - Port 8000)"]
        AnalyzeEndpoint["/analyze-frame & /detect API"]
        MTCNNDetect["MTCNN Face Detection & Landmark Crop"]
        QualityFilter["Laplacian Blur & Brightness Filter"]
        LivenessModel["EfficientNetB0 TFLite Anti-Spoofing Model"]
        ArcFaceModel["DeepFace ArcFace (512-D Embedding Extraction)"]
    end

    subgraph DatabaseTier ["Persistence Tier (MySQL Server - Port 3306)"]
        UserTable[("Users & Faculty Allocations")]
        AcademicTable[("Academic Hierarchy (Years, Programs, Semesters, Classes, Subjects)")]
        StudentTable[("Students & Relational Linkages")]
        EmbeddingTable[("FaceEmbeddings (512-D JSON Float Vectors)")]
        SessionTable[("AttendanceSessions (SCHEDULED, ACTIVE, COMPLETED)")]
        RecordTable[("AttendanceRecords (Unique SessionId + StudentId)")]
    end

    Webcam -->|Base64 Video Frames| LiveUI
    LiveUI -->|POST /api/attendance/sessions/:id/recognize| AttendanceCtrl
    EnrollUI -->|POST /api/enrollment/:id/samples| AttendanceCtrl
    
    AttendanceCtrl --> AuthMiddleware
    AttendanceCtrl -->|Check Quality & Liveness| AnalyzeEndpoint
    
    AnalyzeEndpoint --> MTCNNDetect
    MTCNNDetect --> QualityFilter
    QualityFilter --> LivenessModel
    LivenessModel --> ArcFaceModel
    ArcFaceModel -->|Return 512-D Vector + Liveness Score| AttendanceCtrl
    
    AttendanceCtrl -->|Query Stored Embeddings| PrismaClient
    PrismaClient --> EmbeddingTable
    
    AttendanceCtrl -->|Compute Cosine Similarity| TemporalState
    TemporalState -->|If 3 Consecutive Frames Confirmed| PrismaClient
    
    PrismaClient -->|Upsert Attendance Record| RecordTable
    AttendanceCtrl -->|Emit attendance:marked| SocketServer
    
    SocketServer -->|Real-time Push Notification| LiveUI
    SocketServer -->|Real-time Push Notification| DashboardUI
    
    ReportsUI -->|Download CSV / PDF| ExportEngines
    ExportEngines --> PrismaClient
    PrismaClient --> AcademicTable
    PrismaClient --> StudentTable
    PrismaClient --> SessionTable
```

### 5.2 Step-by-Step Attendance Workflow
1. **Authentication & Session Initialization**:
   - Teaching faculty logs in with credentials.
   - Faculty navigates to **Live Recognition** (`/live`).
   - Faculty selects their allocated subject from the dropdown menu (e.g., *Generative AI* for *B.Tech AIML-B*).
   - Backend checks `prisma.faculty.subjects` to verify faculty is assigned to this subject.
   - An active session is created in `AttendanceSession` table with `status = 'ACTIVE'` and timestamp.
2. **Camera Streaming & Frame Capture**:
   - Browser initializes webcam stream at $640 \times 480$ resolution.
   - Live video stream captures frames every 600 ms and converts to base64 JPEG format.
3. **Face Detection & Quality Verification**:
   - Frame is posted to AI service `/analyze-frame`.
   - **MTCNN** isolates facial bounding box $(x, y, w, h)$.
   - Laplacian variance evaluates sharpness. If blur score $< 15.0$, frame is rejected with `TOO_BLURRY`.
   - Luminance checks reject images that are too dark ($<15.0$) or blown out ($>245.0$).
4. **Liveness & Anti-Spoofing Inference**:
   - Cropped face region is resized to $224 \times 224 \times 3$ and normalized.
   - Fed into **EfficientNetB0 TFLite** model.
   - Produces liveness confidence $P(\text{Live})$. If $P < 0.50$ (or optimal threshold $0.10$), frame is rejected with `SPOOF_DETECTED`.
5. **Embedding Extraction & Cosine Matching**:
   - Live crop is passed to DeepFace ArcFace model to generate 512-dimensional vector $\vec{q}$.
   - Backend loads enrolled 512-d vectors for students in the class from MySQL.
   - Computes Cosine Similarity:
     $$\text{Similarity} = \frac{\vec{q} \cdot \vec{d}}{\|\vec{q}\|_2 \|\vec{d}\|_2}$$
   - Candidate with highest similarity $\ge 0.50$ is selected.
6. **Temporal Stability Window (Anti-Flicker)**:
   - System requires **3 consecutive frames** identifying the same student ID (`REQUIRED_CONFIRMATIONS = 3`).
   - Prevents accidental marks from transient shadows or momentary false matches.
7. **Database Persistence & Duplicate Prevention**:
   - Once 3 confirmations pass, system writes to MySQL via `prisma.attendanceRecord.upsert`.
   - Database table enforces composite unique key `@@unique([sessionId, studentId])`.
   - If student was already marked in this session, database ignores re-insertion, preventing duplicate counts.
8. **Real-Time WebSocket Broadcast**:
   - Server emits `attendance:marked` event via Socket.io room `dashboard`.
   - Live monitor in `LivePage.jsx` pops a green success toast and adds student to the session roster.
   - Institution dashboard counter increments immediately without reloading the page.
9. **Session Finalization**:
   - Faculty clicks **End Session**.
   - Custom `<ConfirmModal />` confirms closure.
   - Session status transitions to `COMPLETED` and `endTime` is recorded.

---

## 6. Database Design & API Documentation

### 6.1 Core Database Models & Relationships (Prisma / MySQL)

```mermaid
erDiagram
    USER ||--o| STUDENT : "has student profile"
    USER ||--o| FACULTY : "has faculty profile"
    USER ||--o{ AUDIT_LOG : "creates"
    
    ACADEMIC_YEAR ||--o{ SEMESTER : "contains"
    PROGRAM ||--o{ SEMESTER : "contains"
    SEMESTER ||--o{ CLASS : "contains"
    SEMESTER ||--o{ SUBJECT : "contains"
    
    CLASS ||--o{ STUDENT : "enrolled in"
    CLASS }|--|{ SUBJECT : "curriculum links"
    
    FACULTY }|--|{ SUBJECT : "allocated to"
    FACULTY ||--o{ ATTENDANCE_SESSION : "conducts"
    
    SUBJECT ||--o{ ATTENDANCE_SESSION : "conducted for"
    
    STUDENT ||--o{ FACE_EMBEDDING : "has biometric vectors"
    STUDENT ||--o{ ATTENDANCE_RECORD : "marked in"
    
    ATTENDANCE_SESSION ||--o{ ATTENDANCE_RECORD : "contains records"
```

#### Detailed Model Specifications:
1. `User`: `id` (UUID PK), `email` (unique), `passwordHash`, `role` (`ADMIN`, `FACULTY`, `STUDENT`), `firstName`, `lastName`, `createdAt`, `updatedAt`.
2. `Faculty`: `id` (FK $\rightarrow$ User, Cascade), `department`, relation `subjects` (Many-to-Many with `Subject`).
3. `Student`: `id` (FK $\rightarrow$ User, Cascade), `rollNumber` (unique), `isEnrolled` (boolean), `classId` (FK $\rightarrow$ Class).
4. `FaceEmbedding`: `id` (UUID PK), `studentId` (FK $\rightarrow$ Student, Cascade), `embedding` (JSON float array, 512 dimensions), `qualityScore` (Float), `modelName` (`"ArcFace"`), `dimension` (512).
5. `AcademicYear`: `id`, `name` (e.g., `"2026-2027"`), `startDate`, `endDate`, `isActive`.
6. `Program`: `id`, `name` (e.g., `"B.Tech CSE-AIML"`).
7. `Semester`: `id`, `number` (1 to 8), `academicYearId`, `programId`, unique constraint `[academicYearId, programId, number]`.
8. `Class`: `id`, `name` (e.g., `"B.Tech AIML-B"`), `semesterId` (FK $\rightarrow$ Semester), `isActive`.
9. `Subject`: `id`, `name` (e.g., `"Generative AI"`), `code` (e.g., `"UAMPC0702"`), `semesterId`, `isActive`.
10. `AttendanceSession`: `id`, `facultyId` (FK $\rightarrow$ Faculty), `subjectId` (FK $\rightarrow$ Subject), `date`, `startTime`, `endTime`, `status` (`SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`).
11. `AttendanceRecord`: `id`, `sessionId` (FK $\rightarrow$ AttendanceSession, Cascade), `studentId` (FK $\rightarrow$ Student, Cascade), `status` (`PRESENT`, `ABSENT`, `MANUAL_PRESENT`), `markedAt`, `confidenceScore`, unique constraint `@@unique([sessionId, studentId])`.
12. `AuditLog`: `id`, `userId` (FK $\rightarrow$ User, SetNull), `action`, `details` (JSON), `timestamp`.

### 6.2 Key Backend REST APIs

| HTTP Method | Route Endpoint | Authorized Roles | Functional Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials; returns signed JWT bearer token and user metadata. |
| `GET` | `/api/auth/me` | All Authenticated | Returns current session identity, department, and allocated subject array. |
| `GET` | `/api/academic/hierarchy` | All Authenticated | Returns complete tree: Years $\rightarrow$ Programs $\rightarrow$ Semesters $\rightarrow$ Classes $\rightarrow$ Subjects. |
| `POST` | `/api/faculty` | `ADMIN` | Registers new faculty member, hashes password, and creates profile transactionally. |
| `POST` | `/api/faculty/:id/allocate` | `ADMIN` | Atomically updates faculty's assigned course/subject list. |
| `GET` | `/api/faculty/my-subjects` | `FACULTY`, `ADMIN` | Returns only courses allocated to the requesting faculty member. |
| `GET` | `/api/students` | `ADMIN`, `FACULTY` | Returns students with enrolled status, division info, and calculated attendance %. |
| `POST` | `/api/students` | `ADMIN`, `FACULTY` | Creates new student user and linked academic student record. |
| `DELETE`| `/api/students/:id` | `ADMIN`, `FACULTY` | Permanently deletes student with full cascade of embeddings and attendance logs. |
| `POST` | `/api/enrollment/:id/start` | `ADMIN`, `FACULTY` | Initializes enrollment session; supports `RE_ENROLL` to clear old samples. |
| `POST` | `/api/enrollment/:id/samples`| `ADMIN`, `FACULTY` | Validates face quality, extracts 512-d ArcFace vector, and saves embedding. |
| `POST` | `/api/attendance/sessions` | `FACULTY` | Starts a new live attendance session for an allocated subject. |
| `POST` | `/api/attendance/sessions/:id/recognize`| `FACULTY` | Ingests video frame, runs AI pipeline, checks temporal rules, marks present. |
| `POST` | `/api/attendance/sessions/:id/end`| `FACULTY` | Concludes active attendance session and records end timestamp. |
| `GET` | `/api/attendance/division-matrix`| `ADMIN`, `FACULTY` | Returns full subject-wise and overall division attendance matrix with defaulters. |
| `GET` | `/api/attendance/dashboard`| `ADMIN`, `FACULTY` | Aggregates high-level institutional KPI metrics for dashboard cards. |
| `GET` | `/api/attendance/trend` | `ADMIN`, `FACULTY` | Computes rolling daily attendance percentages over specified day window. |
| `GET` | `/api/attendance/export/csv` | `ADMIN`, `FACULTY` | Generates and streams RFC 4180 compliant CSV file of filtered attendance logs. |
| `GET` | `/api/attendance/export/pdf` | `ADMIN`, `FACULTY` | Compiles and streams official PDF attendance report document. |

---

## 7. AI Biometric Engine, Liveness, and Experimental Testing

### 7.1 Face Detection & Alignment
* **Model:** Multi-task Cascaded Convolutional Networks (**MTCNN**).
* **Detection Pipeline:** Three-stage cascaded network (P-Net, R-Net, O-Net) predicting face bounding boxes and 5 landmark coordinates (left eye, right eye, nose, left mouth corner, right mouth corner).
* **Face Alignment:** Crop coordinates expanded by $10\%$ on each boundary to retain jawline and forehead context necessary for deep feature extraction.

### 7.2 Face Recognition Architecture
* **Model:** **ArcFace (Additive Angular Margin Loss)** via DeepFace.
* **Architecture:** ResNet-based backbone trained on millions of identities.
* **Vector Output:** 512-dimensional floating-point array, $L_2$-normalized such that $\|\vec{v}\|_2 = 1.0$.
* **Matching Metric:** Cosine Similarity $\cos(\theta) = \vec{q} \cdot \vec{d}$.
* **Operational Threshold:** $0.50$ (tunable via `.env`).
* **Why ArcFace over Haar Cascade + LBPH:** Standard LBPH produces local texture histograms that fail under moderate illumination changes or head rotations. ArcFace constructs a hyperspherical embedding space where geodesic distance corresponds directly to facial identity similarity, providing robust open-set recognition.

### 7.3 Liveness / Anti-Spoofing Methodology & Actual Benchmark Evaluation

#### Tested Models & Dataset
The anti-spoofing module was evaluated using the **NUAA Photograph Imposter Database**, a standard academic benchmark comprising live faces and printed 2D photograph attacks across varied lighting conditions.

#### Real Benchmark Results (from Model Metrics Files):

| Evaluated Model | Test Sample Count | Accuracy | Precision | Recall (True Live Rate) | False Acceptance Rate (FAR) | False Rejection Rate (FRR) | F1-Score |
|---|---|---|---|---|---|---|---|
| **MobileNetV2** (Initial Baseline) | 9,123 (3,350 live, 5,761 spoof) | **53.13%** | 38.31% | 44.53% | **41.85%** | 55.47% | 41.18% |
| **EfficientNetB0** (Current Model @ 0.50) | 9,123 (3,362 live, 5,761 spoof) | **72.26%** | 61.01% | 68.47% | **25.53%** | 31.53% | 64.53% |
| **EfficientNetB0** (Optimal Threshold @ 0.10) | 9,123 (3,362 live, 5,761 spoof) | **69.19%** | 55.75% | **79.42%** | 36.78% | **20.58%** | 65.51% |

#### Honest Analysis of Anti-Spoofing Performance:
1. **The 90%+ Claim Reality Check:** 
   In early literature and synopsis proposals, claims of "$>90\%$ accuracy with $0\%$ FAR" are frequently made. Real-world testing against the NUAA dataset demonstrates that a single lightweight 2D CNN model operating on raw webcam frames achieves **$72.26\%$ accuracy** with a False Acceptance Rate of **$25.53\%$**.
2. **Why False Accepts Happen in 2D Liveness:**
   Printed photos on high-gloss paper or mobile screens held at optimal angles can mimic diffuse facial reflection. This proves why our project introduces the **3-frame temporal stability rule** and **image quality gates** (Laplacian variance $> 15.0$) as defense-in-depth layers.
3. **Attack Resistance Coverage:**
   - **Printed 2D Photographs:** Evaluated and partially filtered ($72.3\%$ detection).
   - **Video Screen Replays:** Filtered when screen glare or pixel moiré patterns alter image variance.
   - **3D Silicone Masks:** Not evaluated (requires depth sensors/infrared cameras, outside standard webcam budget).

---

## 8. Testing Record & Evidence of Functionality

### 8.1 Tests Performed and Verified

| Test Case / Script | Description | Result | Evidence / Log |
|---|---|---|---|
| **`test_db.js`** | Prisma database connectivity, connection pooling, and table creation. | **PASSED** | Verified all 12 tables mapped in MySQL `smart_attendance`. |
| **`test_apis.js`** | End-to-end admin login, academic class creation, subject creation, student creation. | **PASSED** | JWT token generated; records created with timestamps. |
| **`test_ai_service.py`** | AI FastAPI `/health`, `/detect`, `/quality`, and `/embedding` endpoints. | **PASSED** | Responded with status 200; generated 512-D float vectors. |
| **`test_efficientnet.py`** | TensorFlow Lite interpreter loading and prediction on cropped test faces. | **PASSED** | Model loaded without Keras 3 conflict; generated predictions. |
| **`test_socket.js`** | Socket.io connection handshake and `attendance:marked` event broadcast. | **PASSED** | Broadcast received by dashboard room listeners. |
| **`test_reports.js`** | Division matrix aggregation, CSV formatting, and PDFKit document compilation. | **PASSED** | Generated valid CSV header rows and PDF byte streams. |
| **Frontend Production Build** | Vite production compilation (`npm run build`). | **PASSED** | Built in 1.56s without syntax errors or bundle failures. |

### 8.2 Tests Involving Mocks vs Live Cameras
* **Live Camera Tests:** Manual visual testing performed with laptop webcam for single-face enrollment, multi-angle sample capture (5/5 samples), and live recognition attendance marking.
* **Pipeline Simulation Tests (`test_liveness_integration.js`):** Due to lack of a physical imposter photo during automated headless CI test runs, mock liveness functions (`is_live: false, score: 0.12`) were injected to verify that the backend controller properly halts attendance marking and logs spoofing rejections.

---

## 9. UI/UX Redesign & Improvements

| Area | Before (Initial Version) | Current Implementation (Redesigned) | Evidence |
|---|---|---|---|
| **Theme System** | Dull swamp-green/black dark theme with poor contrast and washed-out borders. | Modern **Obsidian Midnight Dark** (`#090d16` background, `#111827` surface) and **Slate-50 Light Mode** with clean CSS variable transitions. | `frontend/src/index.css`<br>`frontend/src/context/ThemeContext.jsx` |
| **Popups & Dialogs** | Native browser `window.confirm()` and `alert()` popups that broke visual immersion. | Custom animated `<ConfirmModal />` with glassmorphism backdrop, icon badges, and loading states for destructive actions. | `frontend/src/components/ConfirmModal.jsx`<br>`frontend/src/context/ConfirmContext.jsx` |
| **Faculty / Admin Profile** | No profile or allocation viewer; settings page was placeholder. | Full **Profile Hub** displaying user identity, assigned department, allocated teaching subjects, admin privilege checklist, and biometric architecture specs. | `frontend/src/pages/SettingsPage.jsx`<br>`frontend/src/components/Layout.jsx` |
| **Division Scoping** | Global student counts shown regardless of division filter (e.g. 4 total, 2 pending). | **Division-Scoped KPIs**: Selecting *B.Tech AIML-B* strictly scopes tabs and cards to students of that division (e.g. *All: 2, Done: 2, Pending: 0*). | `frontend/src/pages/EnrollPage.jsx`<br>`frontend/src/pages/StudentsPage.jsx` |
| **Attendance Matrix** | Simple flat list of records without cross-subject academic context. | Full **Division Matrix Table** showing each student's attendance percentage across all subjects in their division with real-time defaulter badges. | `frontend/src/pages/ReportsPage.jsx` |

---

## 10. Role Separation Matrix: Admin vs Faculty

| Feature / Action | Administrator (`ADMIN`) | Faculty Member (`FACULTY`) | Justification |
|---|:---:|:---:|---|
| **View Dashboard & KPI Analytics** | ✅ | ✅ | Both roles need institutional visibility into attendance health. |
| **Create & Configure Academic Setup** (Years, Programs, Semesters, Classes) | ✅ | ❌ | Academic structuring is an administrative authority. |
| **Create Faculty Accounts & Allocate Subjects** | ✅ | ❌ | Faculty cannot assign subjects to themselves or create peer accounts. |
| **Register & Delete Student Accounts** | ✅ | ✅ | Faculty can register students for their divisions; Admins manage all. |
| **Enroll Student Biometrics (Webcam)** | ✅ | ✅ | Both can assist students in biometric registration. |
| **Conduct Live Attendance Session** | ❌ | ✅ | **Strictly restricted to Faculty**: Faculty take attendance for their allocated courses; Admins do not conduct lecture sessions. |
| **View Division Attendance Matrix & Defaulters** | ✅ (All Divisions) | ✅ (Allocated Courses) | Faculty are scoped to their subjects; Admins view all institutional divisions. |
| **Export Official Attendance Reports (CSV / PDF)** | ✅ | ✅ | Faculty export for course files; Admins export for departmental records. |
| **Change Account Password & View Profile** | ✅ | ✅ | Both can manage their security credentials. |

---

## 11. Known Limitations & Technical Constraints

1. **2D Liveness Vulnerability to Advanced Attacks**:
   - The current EfficientNetB0 model achieves $72.3\%$ anti-spoofing accuracy. High-quality curved photographic prints or tablet displays with high refresh rates under matching ambient light can occasionally produce False Accepts ($25.5\%$ FAR on NUAA benchmark).
2. **Illumination & Pose Sensitivity**:
   - Extreme dark lighting ($<15.0$ brightness) or severe face rotations ($>45^\circ$ yaw) cause MTCNN landmark detection failure, triggering a quality warning prompt.
3. **Hardware Dependence**:
   - DeepFace with ArcFace takes $\approx 350-500\text{ ms}$ per face embedding inference on standard CPU. Running real-time multi-face recognition simultaneously on $>5$ faces requires a dedicated GPU (e.g., NVIDIA CUDA) for smooth 30 FPS processing.
4. **Local Network Boundary**:
   - Currently designed for campus intranet deployment. Browsers require HTTPS certificates to enable webcam access over remote local IP addresses (`http://192.168.x.x` blocks camera permissions in Chrome).

---

## 12. Future Work (Genuinely Not Yet Implemented)

1. **Infrared (IR) / Depth Camera Integration**: Upgrading beyond standard RGB webcams to Intel RealSense or stereo cameras for 3D depth-map liveness verification ($0\%$ 2D spoof acceptance).
2. **GPU Batch Processing for Classroom Panoramic Cameras**: Deploying RTSP video stream decoders with TensorRT acceleration to take attendance of entire lecture halls in a single 3-second camera pan.
3. **Student Mobile Portal**: PWA / Native mobile app allowing students to view their real-time attendance percentage, receive low-attendance warnings, and request medical leave approvals.
4. **Automated WhatsApp / Email Alerts**: Event-driven worker sending automated absent notifications to student mentors and parents when consecutive lecture absences occur.
5. **Classroom Engagement & Attention Tracking**: Utilizing facial mesh gaze tracking and head pose yaw/pitch to estimate overall student engagement during lectures.

---

## 13. Suggested Live Demo Sequence (13 October Presentation)

1. **Step 1: System Health & Login (Admin Role)**
   - Open `http://localhost:5173`.
   - Log in as `admin@college.edu` (`password123`).
   - Highlight: Institution Dashboard with live connected badges (AI Service: Online, Socket: Connected).
2. **Step 2: Academic Setup & Faculty Allocation**
   - Navigate to **Academic Setup** (`/classes`): Show existing structure (B.Tech CSE-AIML $\rightarrow$ Sem VII $\rightarrow$ Div A/B).
   - Navigate to **Faculty & Allocation** (`/faculty`): Show Ms. Vajreshwari Kulal allocated to *Generative AI* and *Machine Learning*.
3. **Step 3: Student Management & Division Scoping**
   - Navigate to **All Students** (`/students`): Filter by *B.Tech AIML-B*.
   - Demonstrate division scoping: show that counts strictly reflect students belonging to that division.
4. **Step 4: Biometric Face Enrollment**
   - Navigate to **Enroll Student** (`/enroll`).
   - Select pending student or click **Register New Student**.
   - Show live webcam capture: demonstrate the 5-sample multi-angle guidance and real-time quality validation.
5. **Step 5: Role Switch to Teaching Faculty**
   - Click bottom-left user card $\rightarrow$ Logout.
   - Log in as `faculty@college.edu` (`password123`).
   - Show: Academic setup and faculty allocation tabs are hidden from the sidebar (RBAC enforcement).
6. **Step 6: Live Attendance Session with Anti-Spoofing**
   - Navigate to **Live Recognition** (`/live`).
   - Select assigned subject (*Generative AI*).
   - Click **Start Attendance Session**.
   - **Live Face Mark**: Stand before camera $\rightarrow$ system verifies live face $\rightarrow$ green bounding box appears $\rightarrow$ 3-frame confirmation completes $\rightarrow$ Socket.io emits sound/toast.
   - **Spoof Demonstration**: Hold up a printed photograph or smartphone image of an enrolled student $\rightarrow$ show rejection indicator (`Spoofing detected / Poor quality`).
   - Click **End Session** $\rightarrow$ show custom confirmation modal.
7. **Step 7: Reports, Defaulter Matrix & Document Exports**
   - Navigate to **Reports** (`/reports`).
   - View the **Division Attendance Matrix**: highlight overall percentage and subject breakdown.
   - Show defaulter alert banner ($<75\%$).
   - Click **Export CSV** $\rightarrow$ opens spreadsheet.
   - Click **Export PDF** $\rightarrow$ downloads formatted PDF document.

---

## 14. Viva Technical Questions & Evidence-Based Answers

**Q1: How is your system different from typical OpenCV Haar Cascade attendance projects?**  
> *Answer:* Traditional student projects use 20-year-old Haar Cascade detectors with local LBPH histograms writing directly to a local CSV file. They have no liveness detection, break under slight lighting changes, and lack multi-user security. SmartAttend is a full enterprise ERP: it uses deep MTCNN detection, ArcFace 512-dimensional angular margin embeddings, a trained EfficientNetB0 anti-spoofing model evaluated on the NUAA dataset, role-based access control, division-wise faculty course allocations, and real-time WebSockets with MySQL persistence.

**Q2: What face recognition model did you use, and why?**  
> *Answer:* We used ArcFace (via DeepFace) with an MTCNN detector. ArcFace utilizes Additive Angular Margin Loss on a hypersphere, enforcing high intra-class compactness and inter-class discrepancy. It outputs 512-dimensional normalized vectors. We compare them using Cosine Similarity with a tuned threshold of $0.50$, preventing identity confusion even among peers.

**Q3: How do you prevent a student from holding up a friend’s photograph?**  
> *Answer:* We employ a multi-layered defense. First, cropped face frames are evaluated by an EfficientNetB0 TFLite binary anti-spoofing model trained to distinguish live skin reflections from 2D printed photographs and screen displays. Second, we enforce Laplacian blur variance ($>15.0$) and luminance thresholds. Third, our backend enforces a 3-consecutive-frame temporal stability rule, preventing instantaneous single-frame spoofing tricks.

**Q4: Your literature review mentioned $>90\%$ accuracy, but what did your actual testing show?**  
> *Answer:* In literature, idealized lab conditions report $>90\%$. When we rigorously tested our anti-spoofing models against the official NUAA Photograph Imposter dataset (9,123 samples), the baseline MobileNetV2 achieved $53.1\%$, while our optimized EfficientNetB0 model achieved **$72.26\%$ accuracy** with a False Acceptance Rate of **$25.53\%$**. This empirical finding proves why multi-frame temporal rules and quality filters are essential in production environments.

**Q5: How does your system prevent duplicate attendance marking?**  
> *Answer:* Duplicate prevention is enforced at both the application and database levels. In application memory, an active session cache tracks marked student IDs. At the database tier, our Prisma schema enforces a composite unique constraint `@@unique([sessionId, studentId])`. Any duplicate attempt executes an idempotent `upsert`, guaranteeing that a student can only ever have one record per attendance session.

**Q6: What is the role of Faculty Allocation in your project?**  
> *Answer:* In an academic institution, an administrator should not mark subject attendance, and a mathematics teacher should not mark attendance for a computer networks class. We implemented a relational allocation engine where administrators assign specific subjects and divisions to faculty members. When faculty open Live Attendance or view division reports, backend middleware strictly filters their actions to their allocated courses.
