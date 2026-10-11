"""
Central configuration for the Smart Attendance System.
Edit values here to tune behaviour without touching other files.
"""

# ── Paths ─────────────────────────────────────────────────────────────────────
DATASET_DIR      = "dataset"
ATTENDANCE_FILE  = "attendance.csv"
LOG_FILE         = "system.log"

# ── Enrollment ────────────────────────────────────────────────────────────────
PHOTOS_PER_STUDENT     = 8    # capture count per student (more = better accuracy)
ENROLLMENT_DELAY_SEC   = 1.0  # seconds between auto-captures during enrollment
MIN_FACE_SIZE          = 100  # minimum face bounding-box dimension in px (quality gate)

# ── DeepFace recognition ──────────────────────────────────────────────────────
RECOGNITION_MODEL      = "ArcFace"          # ArcFace | Facenet512 | VGG-Face
DETECTOR_BACKEND       = "opencv"           # opencv | ssd | mtcnn | retinaface
DISTANCE_METRIC        = "cosine"           # cosine | euclidean | euclidean_l2
RECOGNITION_THRESHOLD  = 0.45              # lower = stricter match (cosine distance)
RECOGNITION_COOLDOWN_SEC = 5               # seconds before re-recognising same face

# ── Liveness (EAR blink detection) ────────────────────────────────────────────
# EAR = Eye Aspect Ratio (Soukupova & Cech, 2016)
EAR_THRESHOLD          = 0.25   # EAR below this → eye considered closed
EAR_CONSEC_FRAMES      = 2      # frames eye must stay closed to count as blink
BLINKS_REQUIRED        = 2      # blinks needed to confirm liveness

# ── Challenge-response (head-pose) ────────────────────────────────────────────
CHALLENGE_ENABLED      = True   # ask user to turn head before recognition
CHALLENGE_ANGLE_DEG    = 15     # degrees yaw needed to satisfy a "turn" challenge
CHALLENGE_TIMEOUT_SEC  = 10     # seconds to complete the challenge

# ── Dashboard ─────────────────────────────────────────────────────────────────
DEFAULTER_THRESHOLD_PCT = 75    # below this attendance % → flagged as defaulter
WORKING_DAYS_PER_MONTH  = 22    # used for attendance % calculations

# ── Display / UI ──────────────────────────────────────────────────────────────
DISPLAY_WIDTH   = 1280
DISPLAY_HEIGHT  = 720
FONT            = 0   # cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE      = 0.65
LINE_THICKNESS  = 2
