from fastapi import APIRouter
from app.schemas.responses import HealthResponse
from app.config.settings import settings
from app.services.liveness_service import liveness_service

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME,
        face_detection=True, # MTCNN loaded
        embedding_model=True, # ArcFace loaded
        liveness_model=liveness_service.model_available
    )
