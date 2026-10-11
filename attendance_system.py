"""
Smart Attendance System — Main Module

Pipeline:
  1. Webcam capture → resize to DISPLAY_WIDTH × DISPLAY_HEIGHT
  2. OpenCV Haar cascade → detect face regions
  3. Facial landmark detection → compute EAR (Eye Aspect Ratio)
  4. Stage 1 liveness: require BLINKS_REQUIRED blinks via EAR
  5. Stage 2 liveness (optional): head-pose challenge-response
  6. DeepFace ArcFace recognition → identity + confidence score
  7. Mark attendance in CSV (once per student per day)
  8. On-screen overlay: bounding box, name, roll no, confidence, status

Multi-face support: each face in the frame gets its own LivenessChecker
instance tracked by position.

Usage:
    python attendance_system.py
"""

import os
import csv
import time
import logging
from datetime import datetime
from collections import defaultdict

import cv2
import numpy as np
from deepface import DeepFace

from config import (
    DATASET_DIR, ATTENDANCE_FILE, LOG_FILE,
    RECOGNITION_MODEL, DETECTOR_BACKEND, DISTANCE_METRIC,
    RECOGNITION_THRESHOLD, RECOGNITION_COOLDOWN_SEC,
    DISPLAY_WIDTH, DISPLAY_HEIGHT, FONT, FONT_SCALE, LINE_THICKNESS,
)
from liveness import LivenessChecker, load_landmark_detector, draw_landmarks

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger(__name__)

# ── Cascade ───────────────────────────────────────────────────────────────────
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


# ── Attendance CSV ─────────────────────────────────────────────────────────────
def mark_attendance(student_label: str) -> bool:
    """Write one row per student per day. Returns True if newly marked."""
    parts    = student_label.rsplit("_", 1)
    roll_no  = parts[-1]
    name     = parts[0].replace("_", " ") if len(parts) == 2 else student_label
    today    = datetime.now().strftime("%Y-%m-%d")
    now_time = datetime.now().strftime("%H:%M:%S")

    file_exists = os.path.isfile(ATTENDANCE_FILE)
    if file_exists:
        with open(ATTENDANCE_FILE, "r", newline="") as f:
            for row in csv.DictReader(f):
                if row.get("RollNo") == roll_no and row.get("Date") == today:
                    return False

    with open(ATTENDANCE_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Name", "RollNo", "Date", "Time"])
        writer.writerow([name, roll_no, today, now_time])

    log.info("Marked: %s  Roll=%s  Date=%s  Time=%s", name, roll_no, today, now_time)
    return True


# ── Recognition ───────────────────────────────────────────────────────────────
_recog_cooldown: dict[str, float] = {}   # student_label -> last recognised time


def recognize_face(frame: np.ndarray):
    """
    Run DeepFace recognition.
    Returns (student_label, confidence_pct) or (None, 0).
    """
    try:
        results = DeepFace.find(
            img_path=frame,
            db_path=DATASET_DIR,
            model_name=RECOGNITION_MODEL,
            distance_metric=DISTANCE_METRIC,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
            silent=True,
        )
        if not results or len(results[0]) == 0:
            return None, 0

        best = results[0].iloc[0]
        dist_col = [c for c in best.index if "distance" in c.lower()]
        distance = float(best[dist_col[0]]) if dist_col else 1.0

        if distance > RECOGNITION_THRESHOLD:
            return None, 0

        identity      = best["identity"]
        student_label = os.path.basename(os.path.dirname(identity))
        confidence    = max(0, int((1 - distance / RECOGNITION_THRESHOLD) * 100))
        return student_label, confidence

    except Exception as e:
        log.warning("Recognition error: %s", e)
        return None, 0


def _on_cooldown(label: str) -> bool:
    last = _recog_cooldown.get(label, 0)
    return (time.time() - last) < RECOGNITION_COOLDOWN_SEC


def _reset_cooldown(label: str):
    _recog_cooldown[label] = time.time()


# ── Per-face tracker ──────────────────────────────────────────────────────────
class FaceTracker:
    """
    Associates a LivenessChecker with a detected face across frames.
    Faces are matched by IoU with previous-frame detections.
    """

    def __init__(self):
        self.trackers: dict[int, dict] = {}   # face_id -> state dict
        self._next_id = 0
        self._prev_boxes: list = []

    def _iou(self, a, b) -> float:
        ax, ay, aw, ah = a;  bx, by, bw, bh = b
        ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
        iy = max(0, min(ay + ah, by + bh) - max(ay, by))
        inter = ix * iy
        union = aw * ah + bw * bh - inter
        return inter / union if union > 0 else 0.0

    def update(self, boxes) -> list[tuple[int, tuple]]:
        """
        Match new boxes to tracked faces; assign new IDs to unmatched boxes.
        Returns list of (face_id, box) pairs.
        """
        used_ids = set()
        result   = []
        new_prev = []

        for box in boxes:
            best_id, best_iou = None, 0.4   # IoU threshold
            for fid, prev_box in self._prev_boxes:
                if fid in used_ids:
                    continue
                score = self._iou(box, prev_box)
                if score > best_iou:
                    best_id, best_iou = fid, score

            if best_id is None:
                best_id = self._next_id
                self._next_id += 1
                self.trackers[best_id] = {
                    "liveness": LivenessChecker(),
                    "status":   "Blink to confirm liveness…",
                    "name":     None,
                    "conf":     0,
                    "marked":   False,
                }

            used_ids.add(best_id)
            new_prev.append((best_id, box))
            result.append((best_id, box))

        # Clean up stale trackers
        active_ids = {fid for fid, _ in new_prev}
        for fid in list(self.trackers.keys()):
            if fid not in active_ids:
                del self.trackers[fid]

        self._prev_boxes = new_prev
        return result


# ── Drawing helpers ───────────────────────────────────────────────────────────
def _put_label(frame, text: str, pos, color=(0, 255, 100), scale=0.6, thickness=2):
    cv2.putText(frame, text, pos, FONT, scale, (0, 0, 0), thickness + 2)
    cv2.putText(frame, text, pos, FONT, scale, color, thickness)


def _draw_face_overlay(frame, box, state: dict):
    x, y, w, h = box
    # Box colour: green if live + recognised, yellow if live, white otherwise
    if state["name"]:
        box_color = (0, 220, 80)
    elif state["liveness"].is_live:
        box_color = (0, 200, 255)
    else:
        box_color = (180, 180, 180)

    cv2.rectangle(frame, (x, y), (x + w, y + h), box_color, LINE_THICKNESS)

    # Corner brackets
    L = max(15, w // 6)
    for (cx, cy), (dx, dy) in [
        ((x, y),     (1, 1)),   ((x + w, y),     (-1, 1)),
        ((x, y + h), (1, -1)),  ((x + w, y + h), (-1, -1)),
    ]:
        cv2.line(frame, (cx, cy), (cx + dx * L, cy), box_color, 3)
        cv2.line(frame, (cx, cy), (cx, cy + dy * L), box_color, 3)

    # Name + confidence
    label_y = y - 10 if y > 40 else y + h + 25
    if state["name"]:
        disp_name = state["name"].replace("_", " ")
        _put_label(frame, f"{disp_name}  [{state['conf']}%]",
                   (x, label_y), (0, 255, 100))
        if state["marked"]:
            _put_label(frame, "✔ PRESENT", (x, label_y + 22), (0, 230, 60), 0.55)
        else:
            _put_label(frame, "Already marked today", (x, label_y + 22),
                       (0, 170, 255), 0.55)
    else:
        _put_label(frame, state["liveness"].status, (x, label_y),
                   (0, 200, 255), 0.55)


def _draw_hud(frame, total_marked: int, session_start: float):
    h, w = frame.shape[:2]
    elapsed  = int(time.time() - session_start)
    mins, sec = divmod(elapsed, 60)
    cv2.rectangle(frame, (0, 0), (w, 45), (20, 20, 20), -1)
    _put_label(frame, "Smart Attendance System",  (10, 30), (0, 230, 120), 0.75, 2)
    _put_label(frame, f"Marked today: {total_marked}",
               (w - 220, 30), (200, 200, 200), 0.6, 1)
    _put_label(frame, f"Session: {mins:02d}:{sec:02d}",
               (w - 380, 30), (180, 180, 180), 0.6, 1)
    _put_label(frame, "ESC = quit   |   R = reset liveness",
               (10, h - 12), (140, 140, 140), 0.5, 1)


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    if not os.path.isdir(DATASET_DIR):
        print("ERROR: dataset/ not found. Run enroll_faces.py first.")
        return
    enrolled = [d for d in os.listdir(DATASET_DIR)
                if os.path.isdir(os.path.join(DATASET_DIR, d))]
    if not enrolled:
        print("ERROR: No students enrolled. Run enroll_faces.py first.")
        return

    detect_landmarks = load_landmark_detector()
    tracker          = FaceTracker()
    session_start    = time.time()
    show_landmarks   = False

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  DISPLAY_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, DISPLAY_HEIGHT)

    print("Attendance system running. Press ESC to quit, L to toggle landmarks, R to reset.\n")
    log.info("Session started.")

    # Count already-marked today
    today        = datetime.now().strftime("%Y-%m-%d")
    marked_today: set[str] = set()
    if os.path.isfile(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, "r") as f:
            for row in csv.DictReader(f):
                if row.get("Date") == today:
                    marked_today.add(row["RollNo"])

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        boxes = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))
        boxes = [tuple(b) for b in boxes]

        face_states = tracker.update(boxes)

        for face_id, box in face_states:
            state   = tracker.trackers[face_id]
            checker = state["liveness"]
            x, y, w, h = box

            # Landmark detection
            landmarks = None
            if detect_landmarks:
                landmarks = detect_landmarks(gray, box)
                if landmarks is not None and show_landmarks:
                    draw_landmarks(frame, landmarks)

            # Liveness update
            if not checker.is_live:
                if landmarks is not None:
                    checker.update(landmarks)
                else:
                    # Fallback: simple Haar eye check
                    roi  = gray[y:y + h, x:x + w]
                    eyes = cv2.CascadeClassifier(
                        cv2.data.haarcascades + "haarcascade_eye.xml"
                    ).detectMultiScale(roi, 1.1, 8)
                    # Count closed→open transition via eye visibility
                    checker.status = ("Eyes visible" if len(eyes) >= 1
                                      else "No eyes — blink naturally")

            # Recognition (triggered once per live confirmation)
            if checker.is_live and state["name"] is None:
                label, conf = recognize_face(frame)
                if label and not _on_cooldown(label):
                    state["name"] = label
                    state["conf"] = conf
                    newly_marked  = mark_attendance(label)
                    state["marked"] = newly_marked
                    parts   = label.rsplit("_", 1)
                    roll_no = parts[-1]
                    if newly_marked:
                        marked_today.add(roll_no)
                    _reset_cooldown(label)
                    disp = label.replace("_", " ")
                    print(f"  {'✅ Marked' if newly_marked else '🔄 Already marked'}: {disp}  [{conf}%]")
                elif not label:
                    state["status"] = "Face not recognised"

            state["status"] = checker.status
            _draw_face_overlay(frame, box, state)

        _draw_hud(frame, len(marked_today), session_start)
        cv2.imshow("Smart Attendance System", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:   # ESC
            break
        elif key == ord("r") or key == ord("R"):
            # Reset all liveness checkers
            for state in tracker.trackers.values():
                state["liveness"].reset()
                state["name"] = None
            print("  Liveness reset.")
        elif key == ord("l") or key == ord("L"):
            show_landmarks = not show_landmarks

    cap.release()
    cv2.destroyAllWindows()
    log.info("Session ended. Total marked today: %d", len(marked_today))
    print(f"\nSession ended. Attendance saved to '{ATTENDANCE_FILE}'.")


if __name__ == "__main__":
    main()
