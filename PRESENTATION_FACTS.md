# PRESENTATION FACTS: SMART ATTENDANCE SYSTEM
**College Presentation Reference Sheet | Review – II (13 October 2026)**  
**Group A18 | Dept. of CSE-AIML | KIT’s College of Engineering (Autonomous), Kolhapur**

> **GUIDANCE FOR AI / CLAUDE PRESENTATION BUILDER:**  
> Use the strict factual data in this document to update the college 9-slide PowerPoint deck.  
> **Do not invent fake 99% accuracy claims**, **do not claim 3D mask resistance**, and **do not revert to proposed single-script architecture**. Present the actual implemented enterprise system.

---

## 1. Core Identity & Presentation Context
* **Project Title:** AI-Based Smart Attendance System using Face Recognition, Liveness Detection and Analytics Dashboard
* **Team:** Group A18
  1. Shreyas Sonepethkar — PRN: `2324000119` (SY AIML-B)
  2. Mohin Mokashi — PRN: `2324000237` (SY AIML-B)
  3. Shravan Mane — PRN: `2324000393` (SY AIML-B)
  4. Nikhil Dhore — PRN: `2324000721` (SY AIML-B)
  5. Shreya Handebag — PRN: `2324000664` (SY AIML-B)
* **Project Guide:** Ms. Vajreshwari Kulal (Assistant Professor)
* **H.O.D.:** Dr. Uma P. Gurav
* **Project Coordinator:** Mr. Avinash P. Budaragade
* **Review Phase:** Project Phase – I | Review – II Presentation (13 October 2026)

---

## 2. Actual Implemented Architecture (Not Proposed!)
SmartAttend is implemented as a decoupled, three-tier microservice architecture:

1. **Client Tier (Port 5173):**
   * React 19 SPA powered by Vite 8 & Tailwind CSS v4.
   * Obsidian Midnight Dark Mode & Slate-50 Light Mode.
   * Real-time Socket.io listener for live attendance popups and zero-refresh dashboard counters.
   * Custom glassmorphic `<ConfirmModal />` system eliminating native browser popups.
2. **Core ERP Backend Tier (Port 5000):**
   * Node.js 22 + Express 4 API server.
   * Prisma ORM 5.22 connected to MySQL 8.
   * JWT stateless authentication (HMAC-SHA256) with strict Role-Based Access Control (`ADMIN`, `FACULTY`, `STUDENT`).
   * Relational Academic Hierarchy: Academic Year $\rightarrow$ Program $\rightarrow$ Semester $\rightarrow$ Class/Division $\rightarrow$ Subject.
   * Faculty Course Allocation engine and session state machine.
   * Duplicate attendance prevention via `@@unique([sessionId, studentId])`.
3. **AI Biometric Tier (Port 8000):**
   * Python 3.10+ FastAPI microservice running on Uvicorn.
   * Face Detection: **MTCNN** (Multi-task Cascaded Convolutional Networks) with 5 facial keypoints.
   * Quality Gates: Laplacian blur variance ($>15.0$) and luminance normalization ($15-245$).
   * Liveness / Anti-Spoofing: **EfficientNetB0 TFLite** binary classifier (trained to reject printed photos and screen replays).
   * Feature Extraction: **ArcFace** (via DeepFace) generating 512-dimensional unit vector embeddings.
   * Similarity Matching: Cosine Similarity with tuned threshold $= 0.50$.
   * Temporal Stability: Requires 3 consecutive frame confirmations before stamping attendance.

---

## 3. Verified Feature Inventory

| Module | Implemented Functionality | Target User | Verification Status |
|---|---|:---:|:---:|
| **Authentication & RBAC** | JWT bearer token auth; role guards for Admin, Faculty, Student | All | **Implemented & Verified** |
| **Academic Hierarchy** | 4-tier structure (Years, Programs, Semesters, Classes/Divisions, Subjects) | Admin | **Implemented & Verified** |
| **Faculty Course Allocation**| Relational course assignment; faculty restricted to allocated subjects | Admin / Faculty | **Implemented & Verified** |
| **Student Roster & Deletion**| Division-scoped student directory with permanent cascade deletion | Admin / Faculty | **Implemented & Verified** |
| **Multi-Angle Face Enrollment**| 5-step guided webcam capture (Front, Left, Right, Tilt) with quality checks | Admin / Faculty | **Implemented & Verified** |
| **Live Facial Attendance** | Real-time camera feed stream, liveness check, ArcFace matching | Faculty Only | **Implemented & Verified** |
| **Duplicate Prevention** | 3-frame temporal buffer + MySQL composite unique constraint | System | **Implemented & Verified** |
| **Division Attendance Matrix**| Subject-wise breakdown table with overall % and $<75\%$ defaulter alerts | Admin / Faculty | **Implemented & Verified** |
| **Document Exports** | Instant RFC-4180 CSV spreadsheet and formatted PDF report downloads | Admin / Faculty | **Implemented & Verified** |
| **Real-Time Push Gateway** | Socket.io event pipes updating faculty monitor & dashboard instantly | All Clients | **Implemented & Verified** |
| **Modern UI/UX Architecture** | Obsidian dark mode + custom ConfirmModal eliminating browser popups | All Users | **Implemented & Verified** |

---

## 4. Verified Quantitative Evaluation & Test Results

> **CRITICAL RULE FOR PRESENTATION:**  
> Do not claim "99% accuracy" or "0% FAR" as an achieved result. State the real benchmark figures from our NUAA test runs.

### NUAA Photograph Imposter Benchmark Evaluation (9,123 Test Samples):
* **Baseline Model (MobileNetV2):**
  * Overall Accuracy: **53.13%**
  * False Acceptance Rate (FAR): **41.85%**
  * False Rejection Rate (FRR): **55.47%**
* **Optimized Model (EfficientNetB0 TFLite @ Threshold 0.50):**
  * Overall Accuracy: **72.26%**
  * Precision: **61.01%**
  * Recall (True Live Identification): **68.47%**
  * False Acceptance Rate (FAR): **25.53%**
  * False Rejection Rate (FRR): **31.53%**
* **Optimized Model (EfficientNetB0 @ Threshold 0.10):**
  * Overall Accuracy: **69.19%**
  * Recall: **79.42%**
  * False Acceptance Rate (FAR): **36.78%**
  * False Rejection Rate (FRR): **20.58%**

### Database State at Audit (Live Verification):
* Users: **23** (Admin, Faculty, Students)
* Faculty Members: **18**
* Active Classes / Divisions: **18** (e.g. B.Tech AIML-A, AIML-B)
* Total Subjects: **88** (e.g. GenAI, Machine Learning, Computer Vision)
* Registered Students: **4** (2 Enrolled with biometrics, 2 Pending)
* Stored Biometric Embeddings: **10** (5 multi-angle 512-D ArcFace vectors per student)
* Completed Attendance Sessions: **1**
* Attendance Records: **2**

---

## 5. Technical Limitations (Must Be Stated Honestly)
1. **2D Liveness Boundary:** EfficientNetB0 filters 2D photo prints and basic replays ($72.3\%$ acc), but high-resolution curved screens under controlled lighting can occasionally bypass single-frame checks without our 3-frame temporal rule.
2. **Extreme Lighting:** Dark classrooms ($<15.0$ brightness) or intense direct backlighting cause MTCNN landmark failures.
3. **Head Pose Range:** Rotations $>45^\circ$ yaw prevent reliable landmark alignment.
4. **Compute Constraints:** Running real-time multi-face recognition simultaneously on $>5$ faces per frame requires a GPU; standard laptop CPUs process single-face feeds comfortably at 2–3 FPS.

---

## 6. How Review – II Differs from Review – I (Key Talking Points)
* **In Review – I (Synopsis):** We proposed a conceptual pipeline based on standard research papers (Haar cascades, basic OpenCV, CSV files).
* **In Review – II (Implementation):** We have built a complete, working academic ERP system:
  1. Transitioned from Haar Cascades to **MTCNN** and **ArcFace 512-D embeddings**.
  2. Implemented and empirically benchmarked deep **EfficientNetB0 anti-spoofing** on 9,123 test samples.
  3. Built full **Role-Based Access Control** and **Faculty Course Allocation**.
  4. Added **Division-wise Attendance Matrices**, automated **defaulter detection**, and **CSV/PDF export**.
  5. Deployed real-time **WebSockets** and designed a modern **Obsidian Dark UI** with custom modal architecture.
