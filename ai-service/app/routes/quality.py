from fastapi import APIRouter
from pydantic import BaseModel
from app.services.face_utils import base64_to_image, calculate_blur, calculate_brightness
from app.config.settings import settings
from app.schemas.responses import QualityResponse
from app.services.face_detector import face_detector
import cv2

router = APIRouter()

class QualityRequest(BaseModel):
    image: str # Base64 (cropped face or full image)

@router.post("/check-quality", response_model=QualityResponse)
def check_quality(request: QualityRequest):
    img = base64_to_image(request.image)
    if img is None:
        return QualityResponse(
            acceptable=False,
            status="INVALID_IMAGE",
            blur_score=0.0,
            brightness=0.0,
            face_size=(0, 0)
        )
    
    target_img = img
    face_w, face_h = img.shape[1], img.shape[0]

    # If full frame provided, detect face and evaluate quality on the face region
    try:
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces = face_detector.detect_faces(rgb_img)
        if faces and len(faces) > 0:
            x, y, w, h = faces[0]['box']
            x = max(0, int(x))
            y = max(0, int(y))
            w = max(10, int(w))
            h = max(10, int(h))
            crop = img[y:y+h, x:x+w]
            if crop.size > 0:
                target_img = crop
                face_w, face_h = w, h
    except Exception as e:
        pass

    blur_score = calculate_blur(target_img)
    brightness = calculate_brightness(target_img)
    
    is_acceptable = True
    status = "GOOD"
    
    min_blur = getattr(settings, 'MIN_BLUR_VARIANCE', 15.0)
    min_bright = getattr(settings, 'MIN_BRIGHTNESS', 15.0)
    max_bright = getattr(settings, 'MAX_BRIGHTNESS', 245.0)

    if blur_score < min_blur:
        is_acceptable = False
        status = "TOO_BLURRY"
    elif brightness < min_bright:
        is_acceptable = False
        status = "TOO_DARK"
    elif brightness > max_bright:
        is_acceptable = False
        status = "TOO_BRIGHT"
    elif face_w < settings.MIN_FACE_SIZE[0] or face_h < settings.MIN_FACE_SIZE[1]:
        is_acceptable = False
        status = "TOO_SMALL"
        
    return QualityResponse(
        acceptable=is_acceptable,
        status=status,
        blur_score=float(blur_score),
        brightness=float(brightness),
        face_size=(int(face_w), int(face_h))
    )
