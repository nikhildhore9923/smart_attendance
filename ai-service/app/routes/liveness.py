from fastapi import APIRouter
from pydantic import BaseModel
from app.services.liveness_service import liveness_service
from app.services.face_utils import base64_to_image
from app.schemas.responses import LivenessResponse

router = APIRouter()

class LivenessRequest(BaseModel):
    image: str # Base64 of face crop

@router.post("/liveness", response_model=LivenessResponse)
def check_liveness(request: LivenessRequest):
    if not liveness_service.model_available:
        return LivenessResponse(
            available=False,
            status="MODEL_NOT_AVAILABLE",
            message="Anti-spoofing model weights are not installed."
        )
        
    try:
        img = base64_to_image(request.image)
        if img is None:
            raise ValueError("Invalid image")
    except Exception:
        return LivenessResponse(
            available=True,
            status="INVALID_IMAGE",
            message="The provided base64 image could not be decoded.",
            is_live=None,
            confidence=None
        )

    is_live, confidence = liveness_service.predict(img)
    
    if is_live is None:
        return LivenessResponse(
            available=True,
            status="PREDICTION_ERROR",
            message="Failed to predict liveness on the provided image.",
            is_live=None,
            confidence=None
        )
        
    return LivenessResponse(
        available=True,
        status="SUCCESS",
        message="Liveness evaluated",
        is_live=is_live,
        confidence=confidence
    )
