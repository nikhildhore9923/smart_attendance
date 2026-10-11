from fastapi import APIRouter
from pydantic import BaseModel
from app.services.face_embedder import face_embedder
from app.services.face_utils import base64_to_image
from app.config.settings import settings
from app.schemas.responses import EmbedResponse

router = APIRouter()

class EmbedRequest(BaseModel):
    image: str # Base64 (should be pre-cropped/aligned face)

@router.post("/embed", response_model=EmbedResponse)
def generate_embedding(request: EmbedRequest):
    img = base64_to_image(request.image)
    
    try:
        embedding = face_embedder.get_embedding(img)
        return EmbedResponse(
            status="SUCCESS",
            embedding=embedding,
            model=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION
        )
    except Exception as e:
        print(f"Exception during embedding: {e}")
        return EmbedResponse(
            status="ERROR",
            model=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION
        )
