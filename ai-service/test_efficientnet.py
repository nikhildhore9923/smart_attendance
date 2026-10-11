import os
import tensorflow as tf
from tensorflow.keras.models import load_model

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')

def test_load():
    print(f"Loading model from {MODEL_PATH}")
    if not os.path.exists(MODEL_PATH):
        print("Model file does not exist yet. Ensure training has finished.")
        return
        
    try:
        model = load_model(MODEL_PATH)
        print("Successfully loaded EfficientNetB0 model using keras.models.load_model!")
        
        # Test a dummy inference
        dummy_input = tf.random.uniform((1, 224, 224, 3))
        prediction = model.predict(dummy_input)
        print(f"Dummy inference successful. Output: {prediction[0][0]}")
    except Exception as e:
        print(f"Failed to load model: {e}")

if __name__ == '__main__':
    test_load()
