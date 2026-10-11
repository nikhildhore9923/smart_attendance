from fastapi import APIRouter, Form
from pydantic import BaseModel
from app.services.face_detector import face_detector
from app.services.face_utils import base64_to_image, calculate_blur, calculate_brightness
from app.schemas.responses import DetectResponse, FaceDetectionResult, BoundingBox
from typing import Optional

router = APIRouter()

class DetectRequest(BaseModel):
    image: str # Base64

@router.post("/detect", response_model=DetectResponse)
def detect_faces(request: DetectRequest):
    img = base64_to_image(request.image)
    if img is None:
        return DetectResponse(status="INVALID_IMAGE", num_faces=0, faces=[])
    
    # MTCNN requires RGB
    import cv2
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    results = face_detector.detect_faces(rgb_img)
    
    if not results:
        return DetectResponse(status="NO_FACE", num_faces=0, faces=[])
        
    faces_data = []
    for res in results:
        x, y, w, h = res['box']
        faces_data.append(FaceDetectionResult(
            box=BoundingBox(x=int(x), y=int(y), w=int(w), h=int(h)),
            confidence=float(res['confidence']),
            landmarks={k: (int(v[0]), int(v[1])) for k, v in res.get('keypoints', {}).items()} if res.get('keypoints') else None
        ))
        
    status = "FACE_DETECTED" if len(faces_data) == 1 else "MULTIPLE_FACES"
    
    return DetectResponse(
        status=status,
        num_faces=len(faces_data),
        faces=faces_data
    )
