import os
# DO NOT SET TF_USE_LEGACY_KERAS!
import tensorflow as tf
from tensorflow.keras.models import load_model

model_path = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')
weights_path = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.weights.h5')

def main():
    print(f"Loading {model_path} ...")
    model = load_model(model_path)
    print(f"Saving weights to {weights_path} ...")
    model.save_weights(weights_path)
    print("Done!")

if __name__ == "__main__":
    main()
