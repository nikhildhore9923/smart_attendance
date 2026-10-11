
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import cv2

from app.services.face_detector import face_detector
from app.services.face_embedder import face_embedder
from app.services.liveness_service import liveness_service
from app.services.face_utils import base64_to_image
from app.schemas.responses import BoundingBox

router = APIRouter()

class AnalyzeRequest(BaseModel):
    image: str

class FaceData(BaseModel):
    box: BoundingBox
    is_live: bool
    liveness_score: float
    embedding: List[float]
    blur_score: float

class AnalyzeResponse(BaseModel):
    status: str
    num_faces: int
    faces: List[FaceData]

@router.post("/analyze-frame", response_model=AnalyzeResponse)
def analyze_frame(request: AnalyzeRequest):
    img = base64_to_image(request.image)
    if img is None:
        return AnalyzeResponse(status="INVALID_IMAGE", num_faces=0, faces=[])
        
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_detector.detect_faces(rgb_img)
    
    if not results:
        return AnalyzeResponse(status="NO_FACE", num_faces=0, faces=[])
        
    faces_data = []
    
    for res in results:
        x, y, w, h = [int(v) for v in res['box']]
        # Expand box slightly for better cropping
        x1 = max(0, x - int(w*0.1))
        y1 = max(0, y - int(h*0.1))
        x2 = min(img.shape[1], x + w + int(w*0.1))
        y2 = min(img.shape[0], y + h + int(h*0.1))
        
        face_crop = img[y1:y2, x1:x2]
        
        if face_crop.size == 0:
            continue
            
        # 1. Liveness
        is_live, liveness_score = liveness_service.predict(face_crop)
        if is_live is None:
            is_live = False # Fail closed for security
            liveness_score = 0.0
            
        # 2. Embedding (DeepFace handles BGR)
        try:
            embedding = face_embedder.get_embedding(face_crop)
        except Exception:
            continue
            
        # 3. Blur (basic variance of laplacian)
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        faces_data.append(FaceData(
            box=BoundingBox(x=x, y=y, w=w, h=h),
            is_live=is_live,
            liveness_score=liveness_score,
            embedding=embedding,
            blur_score=blur_score
        ))
        
    return AnalyzeResponse(
        status="SUCCESS",
        num_faces=len(faces_data),
        faces=faces_data
    )
