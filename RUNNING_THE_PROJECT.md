# Running SmartAttend

This document explains how to start the SmartAttend system. The project consists of three main microservices and a MySQL database.

## Architecture Overview
*   **Database:** MySQL (port 3306)
*   **Backend:** Node.js + Express + Prisma (port 5000)
*   **AI Service:** Python + FastAPI + Uvicorn (port 8000)
*   **Frontend:** React + Vite (port 5173)

---

## First-Time Setup Prerequisites

1.  **MySQL Database:**
    *   Ensure MySQL is installed and running on `localhost:3306`.
    *   Create a database named `smart_attendance`.
    *   Check `backend/.env` to ensure `DATABASE_URL` matches your local MySQL credentials.
    *   Initialize the database tables:
        ```bash
        cd backend
        npx prisma db push
        ```

2.  **Install Node Dependencies:**
    ```bash
    cd backend
    npm install
    
    cd ../frontend
    npm install
    ```

3.  **Install Python Dependencies:**
    *   You must have Python 3.9+ installed.
    *   (Optional but recommended) Create a virtual environment: `python -m venv .venv` and activate it.
    *   Install requirements:
        ```bash
        cd ai-service
        pip install -r requirements.txt
        ```

---

## Method A: Automatic Startup (Recommended for Windows)

For convenience during demonstrations or daily development, you can use the provided Windows Batch script.

1.  Navigate to the project root directory.
2.  Double-click the `start_smart_attend.bat` file.
    *   Alternatively, run it from your command prompt: `start_smart_attend.bat`
3.  **What it does:**
    *   Verifies that all three project folders exist.
    *   Opens three separate Command Prompt windows (one for each service).
    *   Attempts to activate a Python virtual environment (if `.venv` exists).
    *   Starts the AI Service (`uvicorn`) on port 8000.
    *   Starts the Node Backend (`node src/server.js`) on port 5000.
    *   Starts the React Frontend (`npm run dev`) on port 5173.
    *   Automatically opens your default web browser to `http://localhost:5173`.
4.  **How to stop:** Simply close the three new terminal windows that were spawned.

---

## Method B: Manual Startup

If you prefer to start the services manually or are on a non-Windows OS (Linux/macOS), open three separate terminal windows and run the following commands.

### 1. Start the AI Service (Terminal 1)
```bash
cd ai-service

# Activate your virtual environment if you use one, e.g.:
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Start the Node.js Backend (Terminal 2)
```bash
cd backend
node src/server.js
```
*(Wait until you see "Server listening on port 5000")*

### 3. Start the React Frontend (Terminal 3)
```bash
cd frontend
npm run dev
```

Finally, open your web browser and navigate to `http://localhost:5173`.

---

## Default Login Credentials
Once the frontend loads, you can log in with:
*   **Email:** `admin@college.edu`
*   **Password:** `password123`

*(Note: Actual credentials depend on the seed data in your MySQL database)*

---

## Troubleshooting Common Errors

### 1. "PrismaClientInitializationError: Can't reach database"
*   **Cause:** MySQL is not running, or credentials in `backend/.env` are incorrect.
*   **Fix:** Start your MySQL service (e.g., XAMPP, MySQL Workbench, or Windows Services). Verify `DATABASE_URL` matches your root password.

### 2. "Port already in use" (EADDRINUSE)
*   **Cause:** You already have an instance of the backend, frontend, or AI service running in the background.
*   **Fix:** Close all existing terminals, or forcefully kill the process occupying the port (5000, 8000, or 5173).

### 3. Missing Module / "ModuleNotFoundError"
*   **Cause:** Dependencies weren't installed.
*   **Fix:** Run `npm install` in the respective `backend` or `frontend` folders, or `pip install -r requirements.txt` in `ai-service`.

### 4. "Socket connection error / Live Sync Disconnected"
*   **Cause:** The Node.js backend is down, or the authentication token is expired.
*   **Fix:** Ensure Terminal 2 (Node Backend) is running without errors. Refresh the frontend page to acquire a fresh connection.
