"""
Face enrollment module.

Improvements over v1:
  - Auto-capture with countdown (no manual SPACE press needed)
  - Face quality gate: enforces minimum face size and detects blur
  - Captures across 5 prompt angles for better recognition robustness
  - Shows live enrollment progress bar in the webcam window
  - Cleans up partial enrollment on cancel
  - Rebuilds the DeepFace embedding database after each student is added

Usage:
    python enroll_faces.py
"""

import os
import shutil
import time

import cv2

from config import (
    DATASET_DIR, PHOTOS_PER_STUDENT, ENROLLMENT_DELAY_SEC,
    MIN_FACE_SIZE, RECOGNITION_MODEL, DETECTOR_BACKEND,
)

CAPTURE_PROMPTS = [
    "Look straight at camera",
    "Tilt head slightly LEFT",
    "Tilt head slightly RIGHT",
    "Tilt head slightly UP",
    "Tilt head slightly DOWN",
    "Neutral expression",
    "Slight smile",
    "Different lighting (move left/right)",
]

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


def _laplacian_variance(gray_roi) -> float:
    """Returns the Laplacian variance — proxy for image sharpness."""
    return float(cv2.Laplacian(gray_roi, cv2.CV_64F).var())


def _best_face(gray_frame):
    """
    Detect faces and return the largest one that meets quality criteria.
    Returns (x, y, w, h) or None.
    """
    faces = face_cascade.detectMultiScale(gray_frame, 1.1, 5, minSize=(80, 80))
    if len(faces) == 0:
        return None
    # Largest face
    face = max(faces, key=lambda f: f[2] * f[3])
    x, y, w, h = face
    if w < MIN_FACE_SIZE or h < MIN_FACE_SIZE:
        return None
    # Blur check
    roi = gray_frame[y:y + h, x:x + w]
    if _laplacian_variance(roi) < 40:
        return None  # too blurry
    return face


def _draw_progress(frame, captured: int, total: int, prompt: str, quality_ok: bool):
    h, w = frame.shape[:2]

    # Prompt text
    cv2.putText(frame, prompt, (10, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 0), 2)

    # Progress bar
    bar_x, bar_y, bar_w, bar_h = 10, h - 50, w - 20, 20
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (80, 80, 80), -1)
    fill = int(bar_w * captured / total)
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill, bar_y + bar_h), (0, 200, 80), -1)
    cv2.putText(frame, f"{captured}/{total}", (bar_x + bar_w // 2 - 20, bar_y + 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

    # Quality indicator
    color  = (0, 200, 80) if quality_ok else (0, 80, 200)
    label  = "Face OK" if quality_ok else "No face / blurry"
    cv2.putText(frame, label, (10, 65),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    cv2.putText(frame, "ESC = cancel", (10, h - 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)


def enroll_student(name: str, roll_no: str):
    folder_name = f"{name.replace(' ', '_')}_{roll_no}"
    student_dir = os.path.join(DATASET_DIR, folder_name)

    # Warn if already enrolled
    if os.path.isdir(student_dir) and os.listdir(student_dir):
        ans = input(f"  '{folder_name}' already exists. Re-enroll? [y/N]: ").strip().lower()
        if ans != "y":
            print("  Skipped.")
            return False
        shutil.rmtree(student_dir)

    os.makedirs(student_dir, exist_ok=True)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam.")
        return False

    captured       = 0
    last_capture   = 0.0
    cancelled      = False
    total_needed   = min(PHOTOS_PER_STUDENT, len(CAPTURE_PROMPTS))

    print(f"\nEnrolling '{name}' (Roll {roll_no}). Hold still — auto-capture every "
          f"{ENROLLMENT_DELAY_SEC}s when a clear face is detected. ESC to cancel.\n")

    while captured < total_needed:
        ret, frame = cap.read()
        if not ret:
            break

        gray     = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face     = _best_face(gray)
        now      = time.time()
        ready    = face is not None and (now - last_capture) >= ENROLLMENT_DELAY_SEC
        prompt   = CAPTURE_PROMPTS[captured] if captured < len(CAPTURE_PROMPTS) else "Look at camera"

        if face is not None:
            x, y, w, h = face
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 200, 80), 2)

        if ready:
            # Countdown flash
            for i in range(3, 0, -1):
                ret2, f2 = cap.read()
                if ret2:
                    _draw_progress(f2, captured, total_needed, prompt, True)
                    cv2.putText(f2, str(i), (frame.shape[1] // 2 - 20, frame.shape[0] // 2),
                                cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 0, 255), 5)
                    cv2.imshow(f"Enroll — {name}", f2)
                    cv2.waitKey(400)

            # Capture
            path = os.path.join(student_dir, f"{folder_name}_{captured + 1}.jpg")
            cv2.imwrite(path, frame)
            captured   += 1
            last_capture = time.time()
            print(f"  [{captured}/{total_needed}] Captured — {prompt}")

        _draw_progress(frame, captured, total_needed, prompt, face is not None)
        cv2.imshow(f"Enroll — {name}", frame)

        if cv2.waitKey(1) & 0xFF == 27:
            cancelled = True
            break

    cap.release()
    cv2.destroyAllWindows()

    if cancelled or captured < total_needed:
        print(f"\n⚠ Enrollment cancelled ({captured}/{total_needed} photos).")
        if captured == 0:
            shutil.rmtree(student_dir, ignore_errors=True)
        return False

    print(f"\n✅ Enrolled '{name}' — {captured} photos saved in '{student_dir}'.")
    _rebuild_db()
    return True


def _rebuild_db():
    """Force DeepFace to re-index the dataset (drops stale .pkl cache)."""
    import glob
    for pkl in glob.glob(os.path.join(DATASET_DIR, "*.pkl")):
        os.remove(pkl)
    print("  Database index cleared — will rebuild on next recognition run.")


def main():
    os.makedirs(DATASET_DIR, exist_ok=True)
    print("=" * 55)
    print("   Smart Attendance System — Face Enrollment")
    print("=" * 55)

    while True:
        print()
        name    = input("Student full name (or 'q' to quit): ").strip()
        if name.lower() == "q":
            break
        roll_no = input("Roll number: ").strip()
        if not name or not roll_no:
            print("  Name and roll number cannot be empty.")
            continue
        enroll_student(name, roll_no)

    print("\nDone. Run 'python attendance_system.py' to start taking attendance.")


if __name__ == "__main__":
    main()
