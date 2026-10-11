# System Architecture

## 1. High-Level Architecture
The system follows a microservices-inspired architecture where a Node.js server acts as the primary application backend, and a Python service acts as a dedicated AI worker.

```text
                ┌─────────────────────────┐
                │       React App         │
                │  (Vite + Tailwind CSS)  │
                └────────────┬────────────┘
                             │
                     REST + WebSocket
                             │
                             ▼
                ┌─────────────────────────┐
                │    Node.js / Express    │
                │     Main Backend        │
                │ (Auth, Sessions, API)   │
                └────────────┬────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   Authentication      Attendance Engine    Analytics
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │      MySQL         │
                │       + Prisma          │
                └─────────────────────────┘
                             │
                      REST API (Internal)
                             ▼
                ┌─────────────────────────┐
                │    Python AI Service    │
                │                         │
                │ - MTCNN (Detection)     │
                │ - Face Quality Check    │
                │ - CNN (Liveness/Spoof)  │
                │ - ArcFace (Embeddings)  │
                └─────────────────────────┘
```

## 2. Module Responsibilities

### Frontend (React)
- **Dashboard**: Professional UI for analytics and live attendance monitoring.
- **Camera Interface**: Captures frames and streams them to the backend via WebSockets.
- **State Management**: React Context or Redux for user sessions and active attendance sessions.

### Main Backend (Node.js/Express)
- **API Gateway**: Handles all frontend requests.
- **Authentication**: JWT-based auth and RBAC (Admin, Faculty, Student).
- **Business Logic**: Manages classes, subjects, enrollment status, and attendance sessions.
- **WebSocket Hub**: Receives frames from the frontend, routes them to the AI service, and broadcasts results back to the dashboard.
- **Database Interaction**: Uses Prisma to query and mutate MySQL data.

### AI Service (Python)
- **Face Detection**: Uses MTCNN to find faces in a given frame.
- **Quality Assessment**: Evaluates blur, brightness, and resolution.
- **Liveness Verification**: Uses a deep learning model to distinguish real faces from photos/videos.
- **Face Recognition**: Generates 512-D embeddings and computes cosine similarity against stored vectors.

### Database (MySQL)
- Relational storage for users, students, sessions, attendance records, and audit logs.
- Enforces data integrity (preventing duplicate attendance records).
