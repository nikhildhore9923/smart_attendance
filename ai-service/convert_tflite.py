import os
import tensorflow as tf
from tensorflow.keras.models import load_model

model_path = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')
tflite_path = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.tflite')

def convert():
    print(f"Loading {model_path} ...")
    model = load_model(model_path)
    print("Converting to TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    print(f"Saved TFLite model to {tflite_path}")

if __name__ == "__main__":
    convert()
