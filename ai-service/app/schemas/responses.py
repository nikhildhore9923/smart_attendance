from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class HealthResponse(BaseModel):
    status: str
    service: str
    face_detection: bool
    embedding_model: bool
    liveness_model: bool

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class FaceDetectionResult(BaseModel):
    box: BoundingBox
    confidence: float
    landmarks: Optional[Dict[str, tuple]] = None

class DetectResponse(BaseModel):
    status: str # e.g., "FACE_DETECTED", "NO_FACE", "MULTIPLE_FACES"
    num_faces: int
    faces: List[FaceDetectionResult]

class QualityResponse(BaseModel):
    acceptable: bool
    status: str
    blur_score: float
    brightness: float
    face_size: tuple

class EmbedResponse(BaseModel):
    status: str
    embedding: Optional[List[float]] = None
    model: str
    dimension: int

class LivenessResponse(BaseModel):
    available: bool
    status: str
    message: str
    is_live: Optional[bool] = None
    confidence: Optional[float] = None
