import os
import json
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.efficientnet import preprocess_input
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')
RESULTS_PATH = os.path.join(os.path.dirname(__file__), 'threshold_results.json')
IMG_SIZE = (224, 224)
BATCH_SIZE = 32

def load_test_list():
    client_test = os.path.join(DATASET_DIR, 'client_test_face.txt')
    imposter_test = os.path.join(DATASET_DIR, 'imposter_test_face.txt')
    
    def read_file(filepath, label, prefix):
        data = []
        with open(filepath, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if not parts: continue
                img_path = os.path.join(DATASET_DIR, prefix, parts[0])
                data.append({'filename': img_path, 'class': str(label)})
        return pd.DataFrame(data)

    df_client = read_file(client_test, 1, 'ClientFace')
    df_imposter = read_file(imposter_test, 0, 'ImposterFace')
    df_test = pd.concat([df_client, df_imposter], ignore_index=True)
    return df_test

def calculate_metrics(y_true, y_pred):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0,0,0,0)
    far = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    frr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    return acc, prec, rec, f1, far, frr, {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}

def main():
    print("Loading test data...")
    df_test = load_test_list()
    
    test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    test_gen = test_datagen.flow_from_dataframe(
        df_test, x_col='filename', y_col='class', 
        target_size=IMG_SIZE, batch_size=BATCH_SIZE, 
        class_mode='binary', shuffle=False
    )
    
    print("Loading model...")
    model = load_model(MODEL_PATH)
    
    print("Predicting...")
    test_probs = model.predict(test_gen, verbose=1).flatten()
    y_true = test_gen.classes
    
    results = []
    thresholds = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
    
    for thresh in thresholds:
        y_pred = (test_probs >= thresh).astype(int)
        acc, prec, rec, f1, far, frr, cm = calculate_metrics(y_true, y_pred)
        results.append({
            "threshold": float(thresh),
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1": float(f1),
            "far": float(far),
            "frr": float(frr),
            "confusion_matrix": cm
        })
        print(f"Thresh {thresh:.2f} -> Acc: {acc:.4f} | FAR: {far:.4f} | FRR: {frr:.4f}")

    with open(RESULTS_PATH, 'w') as f:
        json.dump(results, f, indent=4)
        
    print(f"Saved results to {RESULTS_PATH}")

if __name__ == '__main__':
    main()
