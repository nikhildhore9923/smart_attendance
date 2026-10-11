from mtcnn import MTCNN
import numpy as np

class FaceDetector:
    def __init__(self):
        self.detector = MTCNN()

    def detect_faces(self, image: np.ndarray):
        """
        Uses MTCNN to detect faces in an RGB image.
        Returns list of dicts: [{'box': [x, y, w, h], 'confidence': 0.99, 'keypoints': {...}}]
        """
        # MTCNN expects RGB
        results = self.detector.detect_faces(image)
        return results

face_detector = FaceDetector()
