"""Central config — backend only."""
import os
from dotenv import load_dotenv

load_dotenv()

# Paths — all relative to the project root (parent of backend/)
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR        = os.path.dirname(BASE_DIR)          # project root
DATASET_DIR     = os.path.join(ROOT_DIR, "dataset")  # root/dataset/
DB_PATH         = os.path.join(BASE_DIR, "attendance.db")
LOG_FILE        = os.path.join(BASE_DIR, "system.log")

# Auth
SECRET_KEY      = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM       = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Recognition
RECOGNITION_MODEL       = "ArcFace"
DETECTOR_BACKEND        = "opencv"
DISTANCE_METRIC         = "cosine"
RECOGNITION_THRESHOLD   = 0.45
RECOGNITION_COOLDOWN_SEC = 5

# Enrollment
PHOTOS_PER_STUDENT  = 8
MIN_FACE_SIZE       = 100    # px
ENROLLMENT_DELAY_SEC = 1.0
CAPTURE_PROMPTS = [
    "Look straight at camera",
    "Tilt head slightly LEFT",
    "Tilt head slightly RIGHT",
    "Tilt head slightly UP",
    "Tilt head slightly DOWN",
    "Neutral expression",
    "Slight smile",
    "Move to different lighting",
]

# Liveness
EAR_THRESHOLD       = 0.25
EAR_CONSEC_FRAMES   = 2
BLINKS_REQUIRED     = 2
CHALLENGE_ENABLED   = True
CHALLENGE_ANGLE_DEG = 15
CHALLENGE_TIMEOUT_SEC = 10

# Analytics
DEFAULTER_THRESHOLD_PCT = 75

# Display
DISPLAY_WIDTH   = 1280
DISPLAY_HEIGHT  = 720
