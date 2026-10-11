"""
Enrollment WebSocket.
Protocol:
  1. Client connects
  2. Client sends JSON text: {"name": "...", "roll_no": "..."}
  3. Server replies: {"type": "start", "total": N, "prompts": [...]}
  4. Client streams JPEG bytes (one per frame, ~150ms interval)
  5. Server replies per frame: {"type": "progress", ...} or {"type": "captured", ...}
  6. Server sends {"type": "done", ...} when all photos captured
"""
import os, json, shutil, logging, time
import numpy as np
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from core.database import get_db, Student, AttendanceRecord
from core.recognition import detect_faces, rebuild_db, augment_and_save, remove_augmented_photos
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASET_DIR, PHOTOS_PER_STUDENT, CAPTURE_PROMPTS, ENROLLMENT_DELAY_SEC_ORIG, MIN_FACE_SIZE

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/enroll", tags=["enroll"])

# Relaxed blur threshold for compressed webcam frames
BLUR_THRESHOLD = 15.0


def _quality_check(gray_roi: np.ndarray):
    """Returns (ok: bool, msg: str)"""
    h, w = gray_roi.shape[:2]
    if w < MIN_FACE_SIZE or h < MIN_FACE_SIZE:
        return False, f"Face too small ({w}px) — move closer"
    lap = float(cv2.Laplacian(gray_roi, cv2.CV_64F).var())
    if lap < BLUR_THRESHOLD:
        return False, "Too blurry — hold still and improve lighting"
    return True, "OK"


@router.websocket("/ws")
async def enroll_ws(ws: WebSocket, db: Session = Depends(get_db)):
    await ws.accept()
    log.info("Enrollment WS connected")

    name = roll_no = None
    captured = 0
    total_needed = min(PHOTOS_PER_STUDENT, len(CAPTURE_PROMPTS))
    last_capture = 0.0
    student_dir = None
    folder_name = None
    session_started = False

    try:
        while True:
            # Accept both text (metadata) and binary (frame) messages
            msg = await ws.receive()

            # ── Metadata message (text) ────────────────────────────────────
            if msg["type"] == "websocket.receive" and msg.get("text"):
                try:
                    meta = json.loads(msg["text"])
                except Exception:
                    continue

                if meta.get("name") and meta.get("roll_no"):
                    name    = meta["name"].strip()
                    roll_no = meta["roll_no"].strip()

                    folder_name = f"{name.replace(' ', '_')}_{roll_no}"
                    student_dir = os.path.join(DATASET_DIR, folder_name)

                    # Re-enroll: wipe existing folder AND old attendance records
                    existing = db.query(Student).filter(Student.roll_no == roll_no).first()
                    if os.path.isdir(student_dir):
                        shutil.rmtree(student_dir)
                    if existing:
                        existing.photo_count = 0
                        db.query(AttendanceRecord)\
                          .filter(AttendanceRecord.roll_no == roll_no)\
                          .delete(synchronize_session=False)
                        db.commit()

                    os.makedirs(student_dir, exist_ok=True)
                    captured = 0
                    session_started = True

                    await ws.send_text(json.dumps({
                        "type":    "start",
                        "total":   total_needed,
                        "prompts": CAPTURE_PROMPTS[:total_needed],
                    }))
                    log.info("Enrollment started: %s (Roll %s)", name, roll_no)

            # ── Frame message (binary JPEG) ────────────────────────────────
            elif msg["type"] == "websocket.receive" and msg.get("bytes"):
                if not session_started or captured >= total_needed:
                    continue

                data   = msg["bytes"]
                np_arr = np.frombuffer(data, dtype=np.uint8)
                frame  = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                if frame is None:
                    continue

                gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = detect_faces(gray)

                current_prompt = CAPTURE_PROMPTS[captured] if captured < len(CAPTURE_PROMPTS) else "Hold still"

                if not faces:
                    await ws.send_text(json.dumps({
                        "type": "progress", "captured": captured, "total": total_needed,
                        "prompt": current_prompt,
                        "quality": False, "quality_msg": "No face detected — centre your face",
                    }))
                    continue

                # Largest face
                face = max(faces, key=lambda f: f[2] * f[3])
                x, y, w, h = face
                roi = gray[y:y+h, x:x+w]
                ok, qmsg = _quality_check(roi)

                now   = time.time()
                ready = ok and (now - last_capture) >= 3.0

                await ws.send_text(json.dumps({
                    "type": "progress", "captured": captured, "total": total_needed,
                    "prompt": current_prompt,
                    "quality": ok, "quality_msg": qmsg,
                    "face": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                }))

                if ready:
                    path = os.path.join(student_dir, f"{folder_name}_{captured + 1}.jpg")
                    cv2.imwrite(path, frame)
                    # Generate 4 augmented variants for better recognition accuracy
                    augment_and_save(path, frame)
                    captured   += 1
                    last_capture = now
                    log.info("Captured %d/%d for %s", captured, total_needed, name)

                    next_prompt = CAPTURE_PROMPTS[captured] if captured < len(CAPTURE_PROMPTS) else "All done!"
                    await ws.send_text(json.dumps({
                        "type": "captured", "captured": captured, "total": total_needed,
                        "prompt": next_prompt,
                    }))

                    if captured >= total_needed:
                        # Save / update DB
                        existing = db.query(Student).filter(Student.roll_no == roll_no).first()
                        if existing:
                            existing.photo_count = captured
                            existing.folder_name = folder_name
                            existing.name        = name
                            existing.is_active   = True
                        else:
                            db.add(Student(
                                name=name, roll_no=roll_no,
                                folder_name=folder_name, photo_count=captured,
                            ))
                        db.commit()
                        rebuild_db()

                        await ws.send_text(json.dumps({
                            "type": "done", "name": name,
                            "roll_no": roll_no, "captured": captured,
                        }))
                        log.info("Enrollment complete: %s (%s)", name, roll_no)
                        return  # close cleanly

    except WebSocketDisconnect:
        log.info("Enrollment WS disconnected — %d/%d photos saved for %s",
                 captured, total_needed, name or "unknown")
        if captured == 0 and student_dir and os.path.isdir(student_dir):
            shutil.rmtree(student_dir, ignore_errors=True)
    except Exception as e:
        log.error("Enrollment WS error: %s", e)
        try:
            await ws.send_text(json.dumps({"type": "error", "msg": str(e)}))
        except Exception:
            pass
