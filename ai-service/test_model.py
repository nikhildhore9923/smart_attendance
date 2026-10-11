import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import cv2

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_model.h5')
TEST_IMAGE = r"D:\NUAA-Liveness\Detectedface\ClientFace\0001\0001_00_00_01_0.jpg"

def main():
    print(f"=== TASK 4: VERIFY MODEL ===")
    
    # 1. Verify that the model actually exists
    if not os.path.exists(MODEL_PATH):
        print(f"[ERROR] Model file does not exist at {MODEL_PATH}")
        sys.exit(1)
    print(f"[SUCCESS] Model file exists: {MODEL_PATH}")
    
    # 2. Load the saved model again
    print("Loading model...")
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    print("[SUCCESS] Model loaded successfully.")
    
    # 3. Run a small inference test
    if not os.path.exists(TEST_IMAGE):
        print(f"[ERROR] Test image not found at {TEST_IMAGE}")
        sys.exit(1)
        
    img = cv2.imread(TEST_IMAGE)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (224, 224))
    img_array = np.expand_dims(resized, axis=0).astype(np.float32)
    
    # Preprocess
    preprocessed = preprocess_input(img_array)
    
    print("Running inference...")
    pred = model.predict(preprocessed)[0][0]
    
    # 4. Verify that the output is a probability between 0 and 1
    print(f"Prediction Output: {pred:.6f}")
    if 0.0 <= pred <= 1.0:
        print("[SUCCESS] Output is a valid probability between 0 and 1.")
    else:
        print("[ERROR] Output is NOT a valid probability.")
        
    # 5. Clearly interpret
    print("\n--- Interpretation ---")
    print("Higher probability (closer to 1.0) = More LIVE (Client)")
    print("Lower probability (closer to 0.0)  = More SPOOF (Imposter)")
    if pred > 0.5:
        print(f"Result: LIVE (Confidence: {pred*100:.2f}%)")
    else:
        print(f"Result: SPOOF (Confidence: {(1-pred)*100:.2f}%)")
    print("=========================")

if __name__ == "__main__":
    main()
