# Development Plan

## 1. Analysis of Existing Implementation
After inspecting the existing workspace (`c:/smart_attendance`), the following observations were made:
- **Backend**: The existing system uses a Python (FastAPI) main backend. This violates the core requirement of using Node.js/Express as the main application server.
- **Database**: The existing system uses SQLite with SQLAlchemy. The requirements mandate MySQL with Prisma ORM.
- **AI Pipeline**: The current face detection relies on Haar Cascades (a prototype-level approach). Liveness detection is based solely on EAR (Eye Aspect Ratio / blink detection), which the requirements explicitly state is "too basic".
- **Frontend**: A React + Vite frontend exists. It can be reused as a foundation but needs to be adapted to communicate with the new Node.js backend and must be visually upgraded to meet the "professional SaaS" requirement.

## 2. Rebuild Strategy
**What to Discard:**
- The entire `backend/` FastAPI application.
- SQLite database files (`attendance.db`).
- Haar cascade models and simplistic blink-detection logic.

**What to Reuse/Refactor:**
- The `frontend/` directory (React, Vite, Tailwind CSS). We will keep the components but refactor the API calls (`lib/api.js`), WebSocket connections, and UI/UX to be more professional.
- The `dataset/` directory containing face images.

**What to Build from Scratch:**
- **Main Backend**: A Node.js + Express application serving as the central hub.
- **Database**: MySQL schema designed with Prisma ORM.
- **AI Microservice**: A dedicated Python service exposing internal APIs for MTCNN face detection, CNN-based liveness verification, and ArcFace/FaceNet embeddings.

## 3. Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts, Socket.IO Client.
- **Main Backend**: Node.js, Express.js, Prisma ORM, Socket.IO, JWT.
- **Database**: MySQL.
- **AI Service**: Python, FastAPI/Flask (internal only), MTCNN, ArcFace, PyTorch/TensorFlow (for Anti-spoofing).

## 4. Execution Plan
We will follow the 14-phase Implementation Roadmap, starting with Project Setup (Phase 1), moving to User Management (Phase 2), AI Pipeline integration (Phases 3-6), and concluding with UI/UX polishing and evaluation.
