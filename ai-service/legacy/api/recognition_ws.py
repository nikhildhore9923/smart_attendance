"""
Multi-face recognition WebSocket.

Classroom mode:
  - Detects ALL faces in every frame simultaneously
  - Recognises each face independently using DeepFace ArcFace
  - Marks attendance for every recognised student in the frame
  - No liveness prompts or delays — students just walk in front of camera
  - Per-student cooldown (5 sec) prevents duplicate marks
  - Broadcasts each marked attendance event to the dashboard live feed
"""
import json, time, logging, asyncio
from datetime import datetime
from typing import Optional
import numpy as np
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.database import SessionLocal, AttendanceRecord, Student
from core.recognition import detect_faces, rebuild_db
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATASET_DIR, RECOGNITION_COOLDOWN_SEC, RECOGNITION_THRESHOLD

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/recognize", tags=["recognition"])

# Fast classroom constants — attendance in ~0.5s
LIVENESS_FRAMES = 2      # only 2 frames needed (very fast)
LBP_THRESHOLD   = 3.0    # very relaxed — JPEG compression naturally lowers scores
IOU_THRESH      = 0.25   # face tracking threshold


_broadcast_listeners: list[asyncio.Queue] = []

def _broadcast(event: dict):
    for q in list(_broadcast_listeners):
        try:
            q.put_nowait(event)
        except Exception:
            pass


# ── Per-student cooldown ───────────────────────────────────────────────────────
_cooldowns: dict[str, float] = {}

def _on_cooldown(roll_no: str) -> bool:
    return (time.time() - _cooldowns.get(roll_no, 0)) < RECOGNITION_COOLDOWN_SEC

def _set_cooldown(roll_no: str):
    _cooldowns[roll_no] = time.time()


# ── DB ─────────────────────────────────────────────────────────────────────────
def _mark_attendance(roll_no: str, name: str, confidence: float, subject: str) -> bool:
    today = datetime.now().strftime("%Y-%m-%d")
    db    = SessionLocal()
    try:
        if db.query(AttendanceRecord).filter(
            AttendanceRecord.roll_no == roll_no,
            AttendanceRecord.date    == today,
            AttendanceRecord.subject == subject,
        ).first():
            return False
        student = db.query(Student).filter(Student.roll_no == roll_no).first()
        db.add(AttendanceRecord(
            roll_no=roll_no, name=name, date=today,
            time=datetime.now().strftime("%H:%M:%S"),
            confidence=confidence, subject=subject,
            student_id=student.id if student else None,
        ))
        db.commit()
        log.info("Marked: %s (%s) %.0f%%", name, roll_no, confidence)
        return True
    except Exception as e:
        db.rollback(); log.error("DB error: %s", e); return False
    finally:
        db.close()


# ── Recognise a single cropped face region ────────────────────────────────────
def _recognize_crop(face_crop: np.ndarray) -> tuple[Optional[str], Optional[str], int]:
    """Run DeepFace on a single face crop. Returns (label, roll_no, confidence)."""
    try:
        from deepface import DeepFace
        results = DeepFace.find(
            img_path=face_crop,
            db_path=DATASET_DIR,
            model_name="ArcFace",
            distance_metric="cosine",
            detector_backend="skip",   # face already cropped — skip detection
            enforce_detection=False,
            silent=True,
        )
        if not results or len(results[0]) == 0:
            return None, None, 0

        df       = results[0]
        dist_col = next((c for c in df.columns if "distance" in c.lower()), None)
        if dist_col is None:
            return None, None, 0

        df   = df.sort_values(dist_col)
        best = df.iloc[0]
        dist = float(best[dist_col])

        if dist > RECOGNITION_THRESHOLD:
            return None, None, 0

        label   = os.path.basename(os.path.dirname(best["identity"]))
        parts   = label.rsplit("_", 1)
        roll_no = parts[-1] if len(parts) == 2 else label
        conf    = max(0, int((1.0 - dist / RECOGNITION_THRESHOLD) * 100))
        return label, roll_no, conf

    except Exception as e:
        log.debug("Recognition error: %s", e)
        return None, None, 0


# ── Main WebSocket ─────────────────────────────────────────────────────────────
@router.websocket("/ws")
async def recognition_websocket(ws: WebSocket):
    await ws.accept()
    subject     = ws.query_params.get("subject", "General")
    frame_count = 0
    log.info("Recognition WS connected — subject: %s", subject)

    try:
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive(), timeout=30.0)
            except asyncio.TimeoutError:
                continue

            if msg.get("type") == "websocket.disconnect":
                break

            data = msg.get("bytes")
            if not data:
                continue

            frame_count += 1

            # Decode JPEG frame
            np_arr = np.frombuffer(data, dtype=np.uint8)
            frame  = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detect_faces(gray)

            if not faces:
                try:
                    await ws.send_text(json.dumps({
                        "type": "status",
                        "status": "Scanning for faces…",
                        "face_count": 0,
                        "results": [],
                    }))
                except Exception:
                    break
                continue

            # Process all detected faces in parallel using asyncio
            face_results = []
            newly_marked = []

            for (x, y, w, h) in faces:
                # Expand crop slightly for better recognition
                pad  = int(max(w, h) * 0.15)
                fh, fw = frame.shape[:2]
                x1   = max(0, x - pad)
                y1   = max(0, y - pad)
                x2   = min(fw, x + w + pad)
                y2   = min(fh, y + h + pad)
                crop = frame[y1:y2, x1:x2]

                if crop.size == 0:
                    continue

                # Run recognition in a thread so it doesn't block the event loop
                label, roll_no, conf = await asyncio.get_event_loop().run_in_executor(
                    None, _recognize_crop, crop
                )

                face_info = {
                    "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                    "label":      label,
                    "roll_no":    roll_no,
                    "confidence": conf,
                    "marked":     False,
                    "name":       None,
                    "status":     "Unknown",
                }

                if label and roll_no:
                    parts = label.rsplit("_", 1)
                    name  = parts[0].replace("_", " ") if len(parts) == 2 else label
                    face_info["name"] = name

                    if not _on_cooldown(roll_no):
                        _set_cooldown(roll_no)
                        newly = _mark_attendance(roll_no, name, conf, subject)
                        face_info["marked"] = newly
                        face_info["status"] = "Marked ✅" if newly else "Already marked"

                        if newly:
                            newly_marked.append(face_info)
                            event = {
                                "type":       "attendance_event",
                                "name":       name,
                                "roll_no":    roll_no,
                                "confidence": conf,
                                "time":       datetime.now().strftime("%H:%M:%S"),
                                "subject":    subject,
                            }
                            _broadcast(event)
                            try:
                                await ws.send_text(json.dumps(event))
                            except Exception:
                                pass
                    else:
                        face_info["name"]   = name
                        face_info["status"] = "Already marked"
                else:
                    face_info["status"] = "Not enrolled"

                face_results.append(face_info)

            # Send frame summary
            active_count = sum(1 for f in face_results if f["label"])
            status_msg   = (
                f"✅ {len(newly_marked)} student(s) marked present"  if newly_marked else
                f"{len(faces)} face(s) detected, {active_count} recognised"  if active_count else
                f"{len(faces)} face(s) detected — not recognised"
            )

            try:
                await ws.send_text(json.dumps({
                    "type":       "status",
                    "status":     status_msg,
                    "face_count": len(faces),
                    "results":    face_results,
                }))
            except Exception:
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.error("Recognition WS error: %s", e)
    finally:
        log.info("Recognition WS closed after %d frames", frame_count)


# ── Dashboard event broadcast ──────────────────────────────────────────────────
@router.websocket("/events")
async def events_websocket(ws: WebSocket):
    await ws.accept()
    q: asyncio.Queue = asyncio.Queue()
    _broadcast_listeners.append(q)
    try:
        while True:
            event = await q.get()
            await ws.send_text(json.dumps(event))
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if q in _broadcast_listeners:
            _broadcast_listeners.remove(q)


# ── REST ───────────────────────────────────────────────────────────────────────
@router.get("/enrolled-count")
def enrolled_count():
    if not os.path.isdir(DATASET_DIR):
        return {"count": 0}
    return {"count": sum(
        1 for d in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, d))
    )}
