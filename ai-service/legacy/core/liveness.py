"""
Liveness detection — EAR blink + head-pose challenge.
Identical logic to the standalone version, adapted for backend use.
"""
import os, time
import numpy as np
import cv2
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    EAR_THRESHOLD, EAR_CONSEC_FRAMES, BLINKS_REQUIRED,
    CHALLENGE_ENABLED, CHALLENGE_ANGLE_DEG, CHALLENGE_TIMEOUT_SEC,
)

LEFT_EYE_IDX  = list(range(36, 42))
RIGHT_EYE_IDX = list(range(42, 48))
NOSE_TIP_IDX  = 30
LEFT_SIDE_IDX = 0
RIGHT_SIDE_IDX = 16


def _ear(pts: np.ndarray) -> float:
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3])
    return (A + B) / (2.0 * C) if C > 1e-6 else 0.0


def _yaw(lm: np.ndarray) -> float:
    nose, left, right = lm[NOSE_TIP_IDX], lm[LEFT_SIDE_IDX], lm[RIGHT_SIDE_IDX]
    face_w = np.linalg.norm(right - left)
    if face_w < 1e-6:
        return 0.0
    return float(((nose[0] - (left[0] + right[0]) / 2.0) / face_w) * 90)


class LivenessChecker:
    def __init__(self):
        self.reset()

    def reset(self):
        self._cc = 0
        self._blinks = 0
        self._blink_done = False
        self._challenge_done = not CHALLENGE_ENABLED
        self._dir = None
        self._t0 = None
        self._base_yaw = None
        self.is_live = False
        self.status = f"Blink {BLINKS_REQUIRED}x to confirm liveness"

    def update(self, landmarks: np.ndarray) -> bool:
        if self.is_live:
            return True

        if not self._blink_done:
            left  = landmarks[LEFT_EYE_IDX]
            right = landmarks[RIGHT_EYE_IDX]
            ear   = (_ear(left) + _ear(right)) / 2.0

            if ear < EAR_THRESHOLD:
                self._cc += 1
            else:
                if self._cc >= EAR_CONSEC_FRAMES:
                    self._blinks += 1
                self._cc = 0

            rem = BLINKS_REQUIRED - self._blinks
            if rem > 0:
                self.status = f"Blink {rem} more time(s)  (EAR {ear:.2f})"
                return False

            self._blink_done = True
            if not CHALLENGE_ENABLED:
                self.is_live = True
                self.status  = "✅ Liveness confirmed"
                return True

        if not self._challenge_done:
            yaw = _yaw(landmarks)
            if self._dir is None:
                import random
                self._dir = random.choice(["LEFT", "RIGHT"])
                self._t0  = time.time()
                self._base_yaw = yaw
                self.status = f"Turn head {self._dir} slowly"
                return False

            if time.time() - self._t0 > CHALLENGE_TIMEOUT_SEC:
                self.reset()
                self.status = "⏰ Timed out — blink again"
                return False

            delta = yaw - self._base_yaw
            ok = (self._dir == "RIGHT" and delta > CHALLENGE_ANGLE_DEG) or \
                 (self._dir == "LEFT"  and delta < -CHALLENGE_ANGLE_DEG)
            if ok:
                self._challenge_done = True
                self.is_live = True
                self.status  = "✅ Liveness confirmed"
                return True
            tl = int(CHALLENGE_TIMEOUT_SEC - (time.time() - self._t0))
            self.status = f"Turn head {self._dir} ({tl}s)"

        return False


def load_landmark_detector():
    """Returns detect(gray, (x,y,w,h)) -> (68,2) ndarray | None, or None if unavailable."""
    # Try dlib
    try:
        import dlib
        import urllib.request, bz2

        path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "shape_predictor_68_face_landmarks.dat"
        )
        if not os.path.exists(path):
            print("[liveness] Downloading dlib predictor (~100 MB)…")
            bz = path + ".bz2"
            urllib.request.urlretrieve(
                "https://github.com/davisking/dlib-models/raw/master/"
                "shape_predictor_68_face_landmarks.dat.bz2", bz
            )
            with bz2.open(bz, "rb") as src, open(path, "wb") as dst:
                dst.write(src.read())
            os.remove(bz)

        detector  = dlib.get_frontal_face_detector()
        predictor = dlib.shape_predictor(path)

        def detect(gray, box):
            x, y, w, h = box
            r  = dlib.rectangle(int(x), int(y), int(x+w), int(y+h))
            sh = predictor(gray, r)
            return np.array([[sh.part(i).x, sh.part(i).y] for i in range(68)], dtype=np.float32)

        print("[liveness] Using dlib.")
        return detect
    except Exception:
        pass

    # Try OpenCV FacemarkLBF
    try:
        import urllib.request
        model = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "lbfmodel.yaml"
        )
        if not os.path.exists(model):
            print("[liveness] Downloading LBF model (~54 MB)…")
            urllib.request.urlretrieve(
                "https://raw.githubusercontent.com/kurnianggoro/GSOC2017/master/data/lbfmodel.yaml",
                model
            )
        fm = cv2.face.createFacemarkLBF()
        fm.loadModel(model)

        def detect_lbf(gray, box):
            x, y, w, h = box
            ok, lm = fm.fit(gray, np.array([[x, y, w, h]], dtype=np.int32))
            if not ok or not lm:
                return None
            return lm[0][0].reshape(68, 2).astype(np.float32)

        print("[liveness] Using OpenCV FacemarkLBF.")
        return detect_lbf
    except Exception:
        pass

    print("[liveness] No landmark model — EAR liveness disabled.")
    return None
