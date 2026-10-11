from deepface import DeepFace
import numpy as np

class FaceEmbedder:
    def __init__(self, model_name="ArcFace"):
        self.model_name = model_name

    def get_embedding(self, face_image: np.ndarray) -> list:
        """
        Uses DeepFace to generate embeddings for a cropped, aligned face.
        Expects BGR or RGB image (DeepFace handles BGR).
        Returns a 1D list of floats (512-D for ArcFace).
        """
        try:
            # Let DeepFace handle the cropping via mtcnn to ensure accurate face features
            result = DeepFace.represent(
                img_path=face_image,
                model_name=self.model_name,
                detector_backend="mtcnn",
                enforce_detection=True
            )
            return result[0]["embedding"]
        except Exception as e:
            raise RuntimeError(f"Embedding generation failed: {str(e)}")

face_embedder = FaceEmbedder(model_name="ArcFace")
