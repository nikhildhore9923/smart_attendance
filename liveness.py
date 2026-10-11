"""
Liveness detection module.

Two-stage anti-spoofing:
  Stage 1 — Passive blink detection via Eye Aspect Ratio (EAR).
             EAR < threshold for ≥ N consecutive frames → eye closed.
             Two such events (open→closed→open) = confirmed blink.

  Stage 2 — Active challenge-response: user must turn head left OR right
             by CHALLENGE_ANGLE_DEG degrees within CHALLENGE_TIMEOUT_SEC.
             Estimated via facial-landmark geometry (no extra model needed).

Both stages must pass before a face is sent to recognition, making it
significantly harder to spoof with a printed photo or screen replay.

Reference:
  Soukupova & Cech (2016) — "Real-Time Eye Blink Detection using
  Facial Landmarks" — introduces the EAR formula used here.
"""

import time
import math
import numpy as np
import cv2

from config import (
    EAR_THRESHOLD, EAR_CONSEC_FRAMES, BLINKS_REQUIRED,
    CHALLENGE_ENABLED, CHALLENGE_ANGLE_DEG, CHALLENGE_TIMEOUT_SEC,
)

# ── Dlib / MediaPipe landmark indices ─────────────────────────────────────────
# We use dlib's 68-point model via the face_recognition library, OR fall back
# to a lightweight approach with OpenCV's FacemarkLBF.
# Index ranges for 68-point model:
#   Left eye:  [36, 37, 38, 39, 40, 41]
#   Right eye: [42, 43, 44, 45, 46, 47]
LEFT_EYE_IDX  = list(range(36, 42))
RIGHT_EYE_IDX = list(range(42, 48))

# Nose tip (30), left ear (0), right ear (16) for yaw estimation
NOSE_TIP_IDX    = 30
LEFT_SIDE_IDX   = 0
RIGHT_SIDE_IDX  = 16


def _eye_aspect_ratio(eye_pts: np.ndarray) -> float:
    """
    EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    eye_pts: (6, 2) array of landmark coordinates for one eye.
    """
    A = np.linalg.norm(eye_pts[1] - eye_pts[5])
    B = np.linalg.norm(eye_pts[2] - eye_pts[4])
    C = np.linalg.norm(eye_pts[0] - eye_pts[3])
    if C < 1e-6:
        return 0.0
    return (A + B) / (2.0 * C)


def _estimate_yaw(landmarks: np.ndarray) -> float:
    """
    Crude yaw estimation from 68-point landmarks.
    Returns yaw in degrees (positive = turned right, negative = turned left).
    """
    nose   = landmarks[NOSE_TIP_IDX]
    left   = landmarks[LEFT_SIDE_IDX]
    right  = landmarks[RIGHT_SIDE_IDX]
    face_width = np.linalg.norm(right - left)
    if face_width < 1e-6:
        return 0.0
    # Nose offset from face centre
    mid_x = (left[0] + right[0]) / 2.0
    offset = (nose[0] - mid_x) / face_width  # normalised -0.5 … +0.5
    return float(offset * 90)  # scale to rough degrees


class LivenessChecker:
    """
    Stateful per-person liveness checker.
    Call update(landmarks) each frame; read .is_live when True.
    Call reset() to start a fresh check.
    """

    def __init__(self):
        self.reset()

    def reset(self):
        self._consec_closed   = 0
        self._blink_count     = 0
        self._blink_done      = False
        self._challenge_done  = not CHALLENGE_ENABLED   # skip if disabled
        self._challenge_dir   = None        # "LEFT" or "RIGHT"
        self._challenge_start = None
        self._base_yaw        = None
        self.is_live          = False
        self.status           = "Blink twice to confirm liveness…"

    def update(self, landmarks: np.ndarray) -> bool:
        """
        Process a frame's landmarks. Returns True once liveness is confirmed.
        landmarks: (68, 2) numpy array.
        """
        if self.is_live:
            return True

        # ── Stage 1: blink detection ──────────────────────────────────────────
        if not self._blink_done:
            left_eye  = landmarks[LEFT_EYE_IDX]
            right_eye = landmarks[RIGHT_EYE_IDX]
            ear = (_eye_aspect_ratio(left_eye) + _eye_aspect_ratio(right_eye)) / 2.0

            if ear < EAR_THRESHOLD:
                self._consec_closed += 1
            else:
                if self._consec_closed >= EAR_CONSEC_FRAMES:
                    self._blink_count += 1
                self._consec_closed = 0

            remaining = BLINKS_REQUIRED - self._blink_count
            if remaining > 0:
                self.status = f"Blink {remaining} more time(s)…  (EAR={ear:.2f})"
                return False

            self._blink_done = True
            if not CHALLENGE_ENABLED:
                self.is_live = True
                self.status  = "✅ Liveness confirmed — Recognising…"
                return True

        # ── Stage 2: head-pose challenge ──────────────────────────────────────
        if not self._challenge_done:
            yaw = _estimate_yaw(landmarks)

            if self._challenge_dir is None:
                # Choose a random challenge direction
                import random
                self._challenge_dir   = random.choice(["LEFT", "RIGHT"])
                self._challenge_start = time.time()
                self._base_yaw        = yaw
                self.status = f"Now slowly turn your head {self._challenge_dir}"
                return False

            # Check timeout
            elapsed = time.time() - self._challenge_start
            if elapsed > CHALLENGE_TIMEOUT_SEC:
                # Reset everything and ask again
                self.reset()
                self.status = "⏰ Challenge timed out — please blink again"
                return False

            delta = yaw - self._base_yaw
            satisfied = (
                (self._challenge_dir == "RIGHT" and delta  >  CHALLENGE_ANGLE_DEG) or
                (self._challenge_dir == "LEFT"  and delta  < -CHALLENGE_ANGLE_DEG)
            )
            if satisfied:
                self._challenge_done = True
                self.is_live         = True
                self.status          = "✅ Liveness confirmed — Recognising…"
                return True
            else:
                time_left = int(CHALLENGE_TIMEOUT_SEC - elapsed)
                self.status = f"Turn head {self._challenge_dir} ({time_left}s left)"

        return False


# ── Landmark detection helpers ────────────────────────────────────────────────

def load_landmark_detector():
    """
    Returns a callable detect(gray_frame, face_rect) -> (68,2) ndarray | None.

    Tries dlib first (most accurate). Falls back to OpenCV FacemarkLBF
    (ships with opencv-contrib). If neither is available returns None and
    the caller must disable EAR-based liveness.
    """
    # ── Option A: dlib ────────────────────────────────────────────────────────
    try:
        import dlib  # type: ignore
        import urllib.request, os

        predictor_path = "shape_predictor_68_face_landmarks.dat"
        if not os.path.exists(predictor_path):
            print("[liveness] Downloading dlib 68-point predictor (~100 MB)…")
            url = (
                "https://github.com/davisking/dlib-models/raw/master/"
                "shape_predictor_68_face_landmarks.dat.bz2"
            )
            bz2_path = predictor_path + ".bz2"
            urllib.request.urlretrieve(url, bz2_path)
            import bz2
            with bz2.open(bz2_path, "rb") as src, open(predictor_path, "wb") as dst:
                dst.write(src.read())
            os.remove(bz2_path)
            print("[liveness] Download complete.")

        detector  = dlib.get_frontal_face_detector()
        predictor = dlib.shape_predictor(predictor_path)

        def detect_dlib(gray, face_rect_xywh):
            x, y, w, h = face_rect_xywh
            rect = dlib.rectangle(int(x), int(y), int(x + w), int(y + h))
            shape = predictor(gray, rect)
            pts = np.array([[shape.part(i).x, shape.part(i).y] for i in range(68)], dtype=np.float32)
            return pts

        print("[liveness] Using dlib landmark detector.")
        return detect_dlib

    except Exception:
        pass

    # ── Option B: OpenCV FacemarkLBF ─────────────────────────────────────────
    try:
        import urllib.request, os

        lbf_model = "lbfmodel.yaml"
        if not os.path.exists(lbf_model):
            print("[liveness] Downloading OpenCV LBF facemark model (~54 MB)…")
            urllib.request.urlretrieve(
                "https://raw.githubusercontent.com/kurnianggoro/"
                "GSOC2017/master/data/lbfmodel.yaml",
                lbf_model,
            )
            print("[liveness] Download complete.")

        facemark = cv2.face.createFacemarkLBF()
        facemark.loadModel(lbf_model)

        def detect_lbf(gray, face_rect_xywh):
            x, y, w, h = face_rect_xywh
            faces_arr = np.array([[x, y, w, h]], dtype=np.int32)
            ok, landmarks = facemark.fit(gray, faces_arr)
            if not ok or len(landmarks) == 0:
                return None
            pts = landmarks[0][0].reshape(68, 2).astype(np.float32)
            return pts

        print("[liveness] Using OpenCV FacemarkLBF landmark detector.")
        return detect_lbf

    except Exception:
        pass

    print("[liveness] WARNING: No landmark detector found. "
          "EAR liveness will fall back to Haar eye cascade.")
    return None


def draw_landmarks(frame, landmarks: np.ndarray, color=(0, 255, 100)):
    """Draw facial landmark dots on frame (for debug / demo purposes)."""
    for (x, y) in landmarks.astype(int):
        cv2.circle(frame, (x, y), 1, color, -1)
    # Highlight eyes
    for idx in LEFT_EYE_IDX + RIGHT_EYE_IDX:
        cv2.circle(frame, tuple(landmarks[idx].astype(int)), 2, (0, 200, 255), -1)
