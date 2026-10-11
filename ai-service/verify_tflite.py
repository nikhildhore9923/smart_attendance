import os
import tensorflow as tf
import numpy as np
import cv2
import time

def preprocess(img_path):
    img = cv2.imread(img_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (224, 224))
    img_array = np.expand_dims(img, axis=0).astype(np.float32)
    return tf.keras.applications.efficientnet.preprocess_input(img_array)

def main():
    h5_path = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')
    tflite_path = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.tflite')
    
    live_img = r'D:\NUAA-Liveness\Detectedface\ClientFace\0001\0001_00_00_01_0.jpg'
    spoof_img = r'D:\NUAA-Liveness\Detectedface\ImposterFace\0001\0001_00_00_01_0.jpg'
    
    live_input = preprocess(live_img)
    spoof_input = preprocess(spoof_img)
    
    print("--- Loading H5 Model ---")
    model_h5 = tf.keras.models.load_model(h5_path)
    
    print("--- Loading TFLite Model ---")
    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    def infer_h5(inp):
        t0 = time.time()
        pred = model_h5.predict(inp, verbose=0)[0][0]
        return pred, time.time() - t0
        
    def infer_tflite(inp):
        t0 = time.time()
        interpreter.set_tensor(input_details[0]['index'], inp)
        interpreter.invoke()
        pred = interpreter.get_tensor(output_details[0]['index'])[0][0]
        return pred, time.time() - t0

    live_pred_h5, live_t_h5 = infer_h5(live_input)
    spoof_pred_h5, spoof_t_h5 = infer_h5(spoof_input)
    
    live_pred_tf, live_t_tf = infer_tflite(live_input)
    spoof_pred_tf, spoof_t_tf = infer_tflite(spoof_input)
    
    print("\n--- RESULTS ---")
    print(f"Live Image H5     : {live_pred_h5:.8f} (took {live_t_h5:.4f}s)")
    print(f"Live Image TFLite : {live_pred_tf:.8f} (took {live_t_tf:.4f}s)")
    print(f"Diff              : {abs(live_pred_h5 - live_pred_tf):.8f}")
    
    print(f"Spoof Image H5    : {spoof_pred_h5:.8f} (took {spoof_t_h5:.4f}s)")
    print(f"Spoof Image TFLite: {spoof_pred_tf:.8f} (took {spoof_t_tf:.4f}s)")
    print(f"Diff              : {abs(spoof_pred_h5 - spoof_pred_tf):.8f}")

if __name__ == "__main__":
    main()
