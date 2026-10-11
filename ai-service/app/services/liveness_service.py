import os
import cv2
import json
import numpy as np
import tensorflow as tf
from app.config.settings import settings

class LivenessService:
    def __init__(self):
        self.model_type = settings.LIVENESS_MODEL_TYPE
        if self.model_type == "MobileNetV2":
            self.model_path = settings.LIVENESS_MOBILENET_PATH
            self.metrics_path = os.path.join(os.path.dirname(self.model_path), 'liveness_metrics.json')
        else:
            self.model_path = settings.LIVENESS_EFFICIENTNET_PATH
            self.metrics_path = os.path.join(os.path.dirname(self.model_path), 'efficientnetb0_metrics.json')
            
        self.model_available = os.path.exists(self.model_path)
        self.model = None
        self.threshold = settings.LIVENESS_DEFAULT_THRESHOLD

        if self.model_available:
            self._load_model()

    def _load_model(self):
        try:
            if self.model_type == "MobileNetV2":
                from tensorflow.keras.applications import MobileNetV2
                from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
                from tensorflow.keras.models import Model
                
                base_model = MobileNetV2(weights=None, include_top=False, input_shape=(224, 224, 3))
                x = base_model.output
                x = GlobalAveragePooling2D()(x)
                x = Dense(128, activation='relu')(x)
                x = Dropout(0.5)(x)
                predictions = Dense(1, activation='sigmoid')(x)
                
                self.model = Model(inputs=base_model.input, outputs=predictions)
                self.model.load_weights(self.model_path)
                
            elif self.model_type == "EfficientNetB0":
                # Use TFLite to bypass Keras 3 vs Legacy Keras conflict with DeepFace
                self.interpreter = tf.lite.Interpreter(model_path=self.model_path)
                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                self.model = True # Dummy flag for availability
            
            # Load dynamic threshold from the validation phase if available
            if os.path.exists(self.metrics_path):
                with open(self.metrics_path, 'r') as f:
                    metrics = json.load(f)
                    if 'optimal_threshold' in metrics:
                        self.threshold = metrics['optimal_threshold']
                        print(f"[INFO] Using validation-selected optimal threshold: {self.threshold}")
                        
            print(f"[SUCCESS] {self.model_type} Liveness model loaded from {self.model_path}")
        except Exception as e:
            self.model_available = False
            print(f"[ERROR] Failed to load liveness model ({self.model_type}): {e}")

    def predict(self, face_crop: np.ndarray):
        """
        Returns (is_live: bool, confidence: float)
        Higher probability = LIVE.
        """
        if not self.model_available or self.model is None:
            return None, None
            
        try:
            resized = cv2.resize(face_crop, (224, 224))
            # Models were trained with specific preprocessing functions
            # Convert BGR (OpenCV) to RGB as models usually expect RGB
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            img_array = np.expand_dims(rgb, axis=0).astype(np.float32)
            
            if self.model_type == "MobileNetV2":
                from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
                preprocessed = preprocess_input(img_array)
                prediction = self.model.predict(preprocessed, verbose=0)[0][0]
            elif self.model_type == "EfficientNetB0":
                from tensorflow.keras.applications.efficientnet import preprocess_input
                preprocessed = preprocess_input(img_array.astype(np.float32))
                self.interpreter.set_tensor(self.input_details[0]['index'], preprocessed)
                self.interpreter.invoke()
                prediction = self.interpreter.get_tensor(self.output_details[0]['index'])[0][0]
            else:
                preprocessed = img_array
                prediction = self.model.predict(preprocessed, verbose=0)[0][0]
            
            # Prediction closer to 1 = LIVE, closer to 0 = SPOOF
            is_live = bool(prediction >= self.threshold)
            return is_live, float(prediction)
        except Exception as e:
            print(f"[ERROR] Inference error: {e}")
            return None, None

liveness_service = LivenessService()
