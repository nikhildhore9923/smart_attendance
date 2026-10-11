# API Design

## Main Application API (Node.js/Express)

### Authentication
- `POST /api/auth/login`: Authenticate user and return JWT.
- `GET /api/auth/me`: Get current user profile.

### Student Management
- `GET /api/students`: List all students.
- `POST /api/students`: Create a new student.
- `GET /api/students/:id`: Get student details.
- `PUT /api/students/:id`: Update student.
- `DELETE /api/students/:id`: Deactivate student.

### Enrollment
- `POST /api/enrollment/start`: Initialize enrollment session for a student.
- `POST /api/enrollment/process-frame`: Send frame for face extraction and embedding generation.
- `POST /api/enrollment/complete`: Finalize enrollment and save embeddings.

### Attendance Sessions
- `GET /api/sessions`: List attendance sessions.
- `POST /api/sessions`: Create a new session (Class, Subject, Time).
- `POST /api/sessions/:id/start`: Change status to ACTIVE.
- `POST /api/sessions/:id/stop`: Change status to COMPLETED.

### Real-Time Attendance (Socket.IO)
- `Event: frame`: Frontend sends video frame.
- `Event: recognition_result`: Backend broadcasts recognition and liveness status.
- `Event: attendance_marked`: Backend broadcasts successful attendance logging.
- `Event: session_update`: Broadcasts changes in session stats (e.g., total present).

### Analytics & Reports
- `GET /api/analytics/dashboard`: Top-level metrics (present today, active sessions).
- `GET /api/analytics/trend`: Time-series attendance data.
- `GET /api/reports/defaulters`: List of students below attendance threshold.
- `GET /api/reports/export`: Generate CSV/PDF report.

---

## Internal AI Service API (Python)
*Note: These endpoints are strictly for internal communication with the Node.js server.*

- `POST /ai/detect`: Accepts an image, returns MTCNN bounding boxes.
- `POST /ai/liveness`: Accepts a cropped face, returns liveness score.
- `POST /ai/embedding`: Accepts an aligned face, returns ArcFace embedding.
- `POST /ai/process-frame`: Composite endpoint; accepts an image, performs detection, liveness, and returns embeddings for all valid faces.
