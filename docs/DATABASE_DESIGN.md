# Database Design

## Technology Stack
- **Database**: MySQL
- **ORM**: Prisma

## Core Entities

### 1. User
Handles authentication and authorization for the system.
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `passwordHash`: String
- `role`: Enum (ADMIN, FACULTY, STUDENT)
- `createdAt`, `updatedAt`

### 2. Student (Extends User)
Specific details for students.
- `id`: UUID (Primary Key, Foreign Key to User)
- `rollNumber`: String (Unique)
- `firstName`: String
- `lastName`: String
- `isEnrolled`: Boolean (True if face data is captured)

### 3. FaceEmbedding
Stores biometric data securely.
- `id`: UUID (Primary Key)
- `studentId`: UUID (Foreign Key to Student)
- `embedding`: Float Array / JSONB (Vector representation)
- `qualityScore`: Float
- `createdAt`: DateTime

### 4. Faculty (Extends User)
Specific details for faculty members.
- `id`: UUID (Primary Key, Foreign Key to User)
- `department`: String
- `firstName`: String
- `lastName`: String

### 5. Subject & Class
Academic structure.
- **Class**: `id`, `name` (e.g., "CSE AIML-B"), `semester`
- **Subject**: `id`, `name`, `code`, `classId`

### 6. AttendanceSession
Represents a single live attendance event.
- `id`: UUID (Primary Key)
- `facultyId`: UUID (Foreign Key to Faculty)
- `subjectId`: UUID (Foreign Key to Subject)
- `date`: DateTime
- `startTime`: DateTime
- `endTime`: DateTime (nullable)
- `status`: Enum (SCHEDULED, ACTIVE, COMPLETED, CANCELLED)

### 7. AttendanceRecord
The actual attendance log.
- `id`: UUID (Primary Key)
- `sessionId`: UUID (Foreign Key to AttendanceSession)
- `studentId`: UUID (Foreign Key to Student)
- `status`: Enum (PRESENT, ABSENT, MANUAL_PRESENT)
- `markedAt`: DateTime
- `livenessScore`: Float
- `confidenceScore`: Float
- *Unique Constraint*: `[sessionId, studentId]` (Prevents duplicate attendance)

### 8. AuditLog
Tracks important administrative actions.
- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key to User)
- `action`: String (e.g., "MANUAL_ATTENDANCE_CORRECTION")
- `details`: JSONB
- `timestamp`: DateTime
