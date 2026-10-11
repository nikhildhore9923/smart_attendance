import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "SmartAttend AI Service"
    DEBUG: bool = True
    
    # Face Detection
    DETECTION_MODEL: str = "MTCNN"
    MIN_FACE_SIZE: tuple = (80, 80)
    
    # Embedding Model (ArcFace/FaceNet)
    # Using 'ArcFace' via DeepFace (produces 512-D embeddings)
    EMBEDDING_MODEL: str = "ArcFace"
    EMBEDDING_DIMENSION: int = 512
    DISTANCE_METRIC: str = "cosine"
    
    # Liveness
    LIVENESS_MODEL_TYPE: str = "EfficientNetB0"  # Options: 'EfficientNetB0', 'MobileNetV2'
    LIVENESS_MOBILENET_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'models', 'liveness', 'anti_spoof_model.h5')
    LIVENESS_EFFICIENTNET_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'models', 'liveness', 'anti_spoof_efficientnetb0.tflite')
    LIVENESS_DEFAULT_THRESHOLD: float = 0.50
    
    # Quality
    MIN_BLUR_VARIANCE: float = 15.0  # Laplacian variance threshold
    MIN_BRIGHTNESS: float = 15.0
    MAX_BRIGHTNESS: float = 245.0
    MIN_FACE_SIZE: tuple = (50, 50)
    
    class Config:
        env_file = ".env"

settings = Settings()
