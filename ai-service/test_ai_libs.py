import sys

try:
    from mtcnn import MTCNN
    import cv2
    import numpy as np
    from deepface import DeepFace

    # Test MTCNN initialization
    detector = MTCNN()
    
    # Create a dummy image
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    faces = detector.detect_faces(dummy_img)
    
    print("MTCNN Initialized Successfully.")
    print("DeepFace imported successfully.")
    sys.exit(0)
except Exception as e:
    print(f"Error initializing AI libraries: {e}")
    sys.exit(1)
