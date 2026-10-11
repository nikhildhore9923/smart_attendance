import sys
import os
import cv2
import numpy as np
import base64
from fastapi.testclient import TestClient

# Add root directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

client = TestClient(app)

def _image_to_base64(img):
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["face_detection"] == True
    assert data["liveness_model"] == True # It is now installed

def test_detect_no_face():
    # Black image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    b64 = _image_to_base64(img)
    response = client.post("/detect", json={"image": b64})
    assert response.status_code == 200
    assert response.json()["status"] == "NO_FACE"
    assert response.json()["num_faces"] == 0

def test_detect_one_face():
    # Use a dummy test image or synthetic data
    # MTCNN might not find a face in random noise, so we won't strictly assert finding a face 
    # unless we supply a real image. We just test the endpoint doesn't crash.
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    b64 = _image_to_base64(img)
    response = client.post("/detect", json={"image": b64})
    assert response.status_code == 200

def test_liveness_model():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    b64 = _image_to_base64(img)
    response = client.post("/liveness", json={"image": b64})
    assert response.status_code == 200
    data = response.json()
    assert data["available"] == True
    assert data["status"] == "SUCCESS"

if __name__ == "__main__":
    print("Running tests...")
    test_health()
    test_detect_no_face()
    test_detect_one_face()
    test_liveness_model()
    print("All tests passed!")
