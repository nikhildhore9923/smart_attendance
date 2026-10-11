"""
FastAPI application entry point.
Run with:  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from core.database import init_db
from api.auth import router as auth_router
from api.students import router as students_router
from api.attendance import router as attendance_router
from api.recognition_ws import router as recognition_router
from api.enroll import router as enroll_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)s  %(levelname)s  %(message)s",
)

app = FastAPI(
    title="Smart Attendance System API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    os.makedirs("dataset", exist_ok=True)
    init_db()
    logging.getLogger(__name__).info("Database initialised. API ready.")

# ── API routes first ──────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(attendance_router)
app.include_router(recognition_router)
app.include_router(enroll_router)

# ── Static assets from React build ───────────────────────────────────────────
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # SPA catch-all — ONLY for non-API paths, registered last
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str, request: Request):
        # Never intercept API calls
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        index = os.path.join(frontend_dist, "index.html")
        return FileResponse(index)
