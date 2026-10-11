# SmartAttend — AI-Powered Smart Attendance ERP System

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](frontend/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_%2B_Express-339933?logo=nodedotjs&logoColor=white)](backend/)
[![FastAPI](https://img.shields.io/badge/AI_Engine-FastAPI_%2B_Python-009688?logo=fastapi&logoColor=white)](ai-service/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)](backend/prisma/)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS_v3-38B2AC?logo=tailwindcss&logoColor=white)](frontend/)

**Enterprise-grade academic attendance management system combining real-time biometric facial recognition, multi-angle liveness detection, and academic ERP workflows.**

---

## 📌 System Architecture

SmartAttend is built on a high-throughput, decoupled microservice architecture:

```mermaid
graph TD
    subgraph Client ["Client Presentation Layer (Port 5173)"]
        UI["React 18 SPA (Vite + Tailwind CSS)"]
        UI_Sub1["Live Attendance Stream (Webcam + Realtime Feed)"]
        UI_Sub2["Guided Biometric Enrollment (Multi-Angle + Quality Check)"]
        UI_Sub3["Academic ERP & Department Analytics (Recharts)"]
        UI_Sub4["Role-Based Access (Admin & Faculty Dashboards)"]
    end

    subgraph CoreBackend ["Core Business & ERP Backend (Port 5000)"]
        NodeServer["Node.js + Express API Server"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        AcademicEngine["Academic Hierarchy (Programs, Semesters, Divisions, Subjects)"]
        AttendanceEngine["Attendance Session Manager & Analytics"]
        SocketIO["Socket.io Real-time Gateway"]
        PrismaORM["Prisma ORM Client"]
    end

    subgraph AIEngine ["AI Biometric Microservice (Port 8000)"]
        FastAPIServer["Python FastAPI Microservice"]
        FaceDetector["Face Detection & Landmark Extraction"]
        LivenessChecker["Passive/Active Anti-Spoofing (EAR + Head Pose)"]
        EmbeddingEngine["DeepFace / ArcFace / FaceNet (512-d Vector Embeddings)"]
        CosineMatcher["Vector Similarity Engine (Cosine Metric < 0.40)"]
    end

    subgraph Storage ["Persistence Layer"]
        RelationalDB[("Relational Database\nUsers, Faculty, Students, Allocations,\nAttendanceSessions, AttendanceRecords")]
        VectorStore[("Biometric Store\n512-d Face Embeddings")]
    end

    UI -->|REST API & JWT Auth| NodeServer
    UI -->|Real-time Socket.io Events| SocketIO
    UI -->|WebSocket Frame Stream| FastAPIServer
    
    NodeServer --> AuthMiddleware
    AuthMiddleware --> AcademicEngine
    AuthMiddleware --> AttendanceEngine
    AttendanceEngine --> PrismaORM
    
    FastAPIServer --> FaceDetector
    FaceDetector --> LivenessChecker
    LivenessChecker --> EmbeddingEngine
    EmbeddingEngine --> CosineMatcher
    
    CosineMatcher -.->|Verify Embeddings| VectorStore
    PrismaORM --> RelationalDB
```

---

## 🚀 Key Features & Capabilities

### 1. 🤖 Deep Biometric Recognition & Anti-Spoofing
* **512-Dimensional Deep Embeddings**: State-of-the-art face vector extraction yielding high identification accuracy and near-zero false-accept rate.
* **Two-Tier Liveness Detection**:
  * **Passive Blink Verification**: Eye Aspect Ratio (EAR) tracking to reject 2D photos, phone screen replays, and cutouts.
  * **Head-Pose Challenge**: 3D yaw/pitch orientation verification to prevent static spoofing attacks.
* **Multi-Angle Guided Enrollment**: Step-by-step guided capture (Straight, Left, Right, Tilt) with real-time blur and lighting validation.

### 2. 🏛️ Complete Academic Hierarchy & Scoping
* **Strict Division Scoping**: Classes, Semesters, Divisions (e.g., *B.Tech AIML - Div B*), and Subjects.
* **Faculty Allocations**: Faculty members are allocated specific subjects and divisions, preventing unauthorized attendance manipulation.
* **Scoped KPI Dashboards**: Student rosters, enrollment statuses (All, Done, Pending), and live attendance percentages dynamically adapt to selected division filters.

### 3. 🎨 Modern Obsidian Glassmorphism UI
* **Obsidian Midnight Dark & Crisp Slate Light Themes**: High-contrast, accessibility-tested color palettes.
* **Custom Modal Architecture**: Replaced browser `alert()` and `confirm()` prompts with responsive, glassmorphic confirmation dialogs.
* **User Profile Hub**: Faculty and Admins can view teaching allocations, assigned departments, security credentials, and biometric specs.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios, Socket.io-client |
| **Backend API** | Node.js, Express, Prisma ORM, JSON Web Tokens (JWT), Bcrypt |
| **AI / Computer Vision** | Python 3.10+, FastAPI, Uvicorn, OpenCV, MediaPipe, DeepFace, ArcFace / FaceNet, NumPy |
| **Database** | Relational Database (PostgreSQL / MySQL / SQLite supported via Prisma) |

---

## ⚡ Quick Start & Startup Guide

For detailed step-by-step setup instructions, please see the **[Startup Guide (RUNNING_THE_PROJECT.md)](RUNNING_THE_PROJECT.md)**.

### Summary of Startup Commands:

#### 1. AI Service (Python FastAPI)
```bash
cd ai-service
# Activate your virtual environment (if using one)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
> Running at: `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`)

#### 2. Core Backend (Node.js & Express)
```bash
cd backend
npm install
npx prisma db push
node src/server.js
```
> Running at: `http://localhost:5000`

#### 3. Frontend (React & Vite)
```bash
cd frontend
npm install
npm run dev
```
> Web Dashboard at: `http://localhost:5173`

---

## 🔐 Default Credentials

| Role | Email / Username | Password |
|---|---|---|
| **Admin** | `admin@college.edu` | `password123` |
| **Faculty** | `faculty@college.edu` | `password123` |

*(Credentials can be updated at any time in the Settings / Profile tab)*

---

## 📋 Academic Project & Viva Overview

| Evaluation Component | Technical Implementation Details |
|---|---|
| **Face Detection** | OpenCV / MediaPipe face ROI isolation and bounding box regression |
| **Anti-Spoofing & Liveness** | EAR (Eye Aspect Ratio) blink rate tracking + dynamic head pose yaw estimation |
| **Face Recognition Engine** | DeepFace 512-dimensional vector embedding extraction + Cosine Similarity matching |
| **Academic ERP Hierarchy** | Relational data model mapping Programs $\rightarrow$ Semesters $\rightarrow$ Divisions $\rightarrow$ Subjects $\rightarrow$ Faculty Allocations |
| **Full Cascade Deletion** | Complete cascade cleanup of student accounts, biometric embeddings, and attendance history |
| **Real-Time Synchronization** | WebSocket and Socket.io event pipes updating faculty monitors and dashboards with zero latency |
| **Security & RBAC** | Stateless JWT authentication, role guards (ADMIN vs FACULTY), and bcrypt credential hashing |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
