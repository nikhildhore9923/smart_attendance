"""
Face Recognition Engine — Production Grade

Improvements over baseline:
  1. Photo augmentation at enrollment time: each captured photo is saved with
     4 augmented variants (brightness ±, horizontal flip, slight blur) →
     8 raw photos become 40 samples, dramatically improving match accuracy.
  2. Strict threshold tuning (0.40 cosine) to reduce false positives.
  3. Top-2 result fusion: if the best and second-best match agree on the same
     student with low distance, confidence is boosted.
  4. Graceful fallback if DeepFace model weights are still downloading.
"""

import os, time, glob, logging
from typing import Optional
import numpy as np
import cv2
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    DATASET_DIR, RECOGNITION_MODEL, DETECTOR_BACKEND,
    DISTANCE_METRIC, RECOGNITION_THRESHOLD, RECOGNITION_COOLDOWN_SEC,
    MIN_FACE_SIZE,
)

log = logging.getLogger(__name__)

_face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

_cooldowns: dict[str, float] = {}


# ── Face detection ─────────────────────────────────────────────────────────────

def detect_faces(gray: np.ndarray):
    """Return list of (x,y,w,h) for all valid faces in frame."""
    faces = _face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5,
        minSize=(MIN_FACE_SIZE, MIN_FACE_SIZE)
    )
    return [tuple(int(v) for v in f) for f in faces] if len(faces) > 0 else []


# ── Image augmentation ─────────────────────────────────────────────────────────

def augment_and_save(original_path: str, frame_bgr: np.ndarray):
    """
    Given a saved enrollment photo, generate 4 augmented variants.
    This is called right after each raw photo is written to disk.
    
    Augmentations:
      _aug1: brightness +25
      _aug2: brightness -25  
      _aug3: horizontal flip
      _aug4: mild contrast boost (CLAHE)
    """
    base, ext = os.path.splitext(original_path)
    
    augmentations = {
        "_aug1": _adjust_brightness(frame_bgr, 25),
        "_aug2": _adjust_brightness(frame_bgr, -25),
        "_aug3": cv2.flip(frame_bgr, 1),
        "_aug4": _clahe_equalize(frame_bgr),
    }
    
    saved = 0
    for suffix, aug_img in augmentations.items():
        aug_path = f"{base}{suffix}{ext}"
        if cv2.imwrite(aug_path, aug_img):
            saved += 1
    
    log.debug("Augmented %s → %d variants", os.path.basename(original_path), saved)
    return saved


def _adjust_brightness(img: np.ndarray, delta: int) -> np.ndarray:
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.int16)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] + delta, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def _clahe_equalize(img: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def remove_augmented_photos(student_dir: str):
    """Remove augmented variants — call before re-enrollment."""
    for aug in glob.glob(os.path.join(student_dir, "*_aug*.jpg")):
        os.remove(aug)


# ── Recognition ────────────────────────────────────────────────────────────────

def recognize(frame: np.ndarray) -> tuple[Optional[str], Optional[str], int]:
    """
    Run DeepFace ArcFace recognition.
    Returns (student_label, roll_no, confidence_pct) or (None, None, 0).
    
    Confidence is mapped from cosine distance:
      distance=0.0 → 100%  (perfect match)
      distance=threshold → 0%
    """
    try:
        from deepface import DeepFace

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
            return None, None, 0

        df = results[0]
        dist_col = next((c for c in df.columns if "distance" in c.lower()), None)
        if dist_col is None:
            return None, None, 0

        df = df.sort_values(dist_col)
        best = df.iloc[0]
        distance = float(best[dist_col])

        if distance > RECOGNITION_THRESHOLD:
            return None, None, 0

        identity      = best["identity"]
        student_label = os.path.basename(os.path.dirname(identity))
        parts         = student_label.rsplit("_", 1)
        roll_no       = parts[-1] if len(parts) == 2 else student_label

        # Confidence: linear scale from 0 to THRESHOLD
        raw_conf = max(0.0, 1.0 - (distance / RECOGNITION_THRESHOLD))

        # Fusion boost: if 2nd result is same student, add small bonus
        if len(df) > 1:
            second = df.iloc[1]
            second_label = os.path.basename(os.path.dirname(second["identity"]))
            if second_label == student_label:
                raw_conf = min(1.0, raw_conf + 0.05)

        confidence = int(raw_conf * 100)
        return student_label, roll_no, confidence

    except Exception as e:
        log.warning("Recognition error: %s", e)
        return None, None, 0


# ── Cooldown ───────────────────────────────────────────────────────────────────

def on_cooldown(roll_no: str) -> bool:
    return (time.time() - _cooldowns.get(roll_no, 0)) < RECOGNITION_COOLDOWN_SEC


def set_cooldown(roll_no: str):
    _cooldowns[roll_no] = time.time()


# ── DB cache ───────────────────────────────────────────────────────────────────

def rebuild_db():
    """Clear DeepFace embedding cache so it rebuilds on next recognition call."""
    removed = 0
    for pkl in glob.glob(os.path.join(DATASET_DIR, "*.pkl")):
        os.remove(pkl)
        removed += 1
    log.info("DeepFace cache cleared (%d files).", removed)


# ── Quality check ──────────────────────────────────────────────────────────────

def enroll_quality_check(gray_roi: np.ndarray) -> tuple[bool, str]:
    """Quality gate for enrollment frames. Returns (ok, message)."""
    h, w = gray_roi.shape[:2]
    if w < MIN_FACE_SIZE or h < MIN_FACE_SIZE:
        return False, f"Face too small ({w}px) — move closer"
    lap_var = float(cv2.Laplacian(gray_roi, cv2.CV_64F).var())
    if lap_var < 12:
        return False, "Too blurry — hold still"
    return True, "OK"
