"""One-time patch: inject fast recognition constants + fix enrollment delay."""
import re

# ── Fix recognition_ws.py ─────────────────────────────────────────────────────
rws_path = 'backend/api/recognition_ws.py'
with open(rws_path, 'r', encoding='utf-8') as f:
    src = f.read()

INJECT = '''
# Fast classroom constants — attendance in ~0.5s
LIVENESS_FRAMES = 2      # only 2 frames needed (very fast)
LBP_THRESHOLD   = 3.0    # very relaxed — JPEG compression naturally lowers scores
IOU_THRESH      = 0.25   # face tracking threshold

'''

marker = 'router = APIRouter(prefix="/api/recognize", tags=["recognition"])\n'
if 'LIVENESS_FRAMES' not in src:
    src = src.replace(marker, marker + INJECT, 1)
    print('Injected LIVENESS_FRAMES constants')
else:
    # Update existing values
    src = re.sub(r'LIVENESS_FRAMES\s*=\s*\d+', 'LIVENESS_FRAMES = 2', src)
    src = re.sub(r'LBP_THRESHOLD\s*=\s*[\d.]+', 'LBP_THRESHOLD   = 3.0', src)
    print('Updated existing constants')

# Also fix frames_needed usage if it references a different variable
src = re.sub(r'frames_needed\s*=\s*\d+', 'frames_needed = LIVENESS_FRAMES', src)

with open(rws_path, 'w', encoding='utf-8') as f:
    f.write(src)

# Verify
for line in src.splitlines():
    if 'LIVENESS_FRAMES' in line or 'LBP_THRESHOLD' in line or 'frames_needed' in line:
        print(' ✓', line.strip())

# ── Fix enroll.py — slow down prompts ─────────────────────────────────────────
enroll_path = 'backend/api/enroll.py'
with open(enroll_path, 'r', encoding='utf-8') as f:
    esrc = f.read()

# Increase delay between captures from 1.0 to 3.0 seconds
esrc = re.sub(r'ENROLLMENT_DELAY_SEC\b', 'ENROLLMENT_DELAY_SEC_ORIG', esrc)
# Use hardcoded 3s in the ready check
esrc = re.sub(
    r'ready\s*=\s*ok\s*and\s*\(now\s*-\s*last_capture\)\s*>=\s*\S+',
    'ready = ok and (now - last_capture) >= 3.0',
    esrc
)

with open(enroll_path, 'w', encoding='utf-8') as f:
    f.write(esrc)

print('Enrollment delay set to 3.0s per capture')
print('Done.')
