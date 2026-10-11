import os
import json
import cv2
import numpy as np
import pandas as pd
from skimage.feature import local_binary_pattern
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib

DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_lbp_svm.pkl')
METRICS_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'lbp_svm_metrics.json')

LBP_RADIUS = 1
LBP_POINTS = 8 * LBP_RADIUS
LBP_METHOD = 'uniform'

def load_nuaa_lists():
    files = {
        'client_train': os.path.join(DATASET_DIR, 'client_train_face.txt'),
        'imposter_train': os.path.join(DATASET_DIR, 'imposter_train_face.txt'),
        'client_test': os.path.join(DATASET_DIR, 'client_test_face.txt'),
        'imposter_test': os.path.join(DATASET_DIR, 'imposter_test_face.txt')
    }
    
    def read_file(filepath, label, prefix):
        data = []
        with open(filepath, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if not parts: continue
                img_path = os.path.join(DATASET_DIR, prefix, parts[0])
                data.append({'filename': img_path, 'class': label})
        return pd.DataFrame(data)

    df_client_train = read_file(files['client_train'], 1, 'ClientFace')
    df_imposter_train = read_file(files['imposter_train'], 0, 'ImposterFace')
    df_client_test = read_file(files['client_test'], 1, 'ClientFace')
    df_imposter_test = read_file(files['imposter_test'], 0, 'ImposterFace')
    
    df_train = pd.concat([df_client_train, df_imposter_train], ignore_index=True)
    df_test = pd.concat([df_client_test, df_imposter_test], ignore_index=True)
    
    return df_train, df_test

def extract_lbp_features(image_path):
    # Read image as grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
        
    # Resize to a consistent scale (64x64 is standard for LBP to capture micro-textures without getting noisy)
    img = cv2.resize(img, (64, 64))
    
    # Extract LBP
    lbp = local_binary_pattern(img, LBP_POINTS, LBP_RADIUS, LBP_METHOD)
    
    # Calculate histogram
    n_bins = int(lbp.max() + 1)
    hist, _ = np.histogram(lbp.ravel(), bins=n_bins, range=(0, n_bins))
    
    # Normalize histogram
    hist = hist.astype("float")
    hist /= (hist.sum() + 1e-7)
    
    return hist

def prepare_data(df):
    X, y = [], []
    for idx, row in df.iterrows():
        features = extract_lbp_features(row['filename'])
        if features is not None:
            X.append(features)
            y.append(row['class'])
        if idx > 0 and idx % 1000 == 0:
            print(f"Processed {idx} images...")
    return np.array(X), np.array(y)

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
    print("Loading NUAA lists...")
    df_train, df_test = load_nuaa_lists()
    
    print(f"Train samples: {len(df_train)}")
    print(f"Test samples: {len(df_test)}")
    
    print("\nExtracting LBP features for Training Set...")
    X_train, y_train = prepare_data(df_train)
    
    print("\nExtracting LBP features for Test Set...")
    X_test, y_test = prepare_data(df_test)
    
    print("\nTraining RBF SVM Classifier on LBP features...")
    # Using probability=True to allow thresholding later if needed, but we'll test default 0.5 first
    clf = Pipeline([
        ('scaler', StandardScaler()),
        ('svm', SVC(kernel='rbf', C=1.0, gamma='scale', probability=True, random_state=42))
    ])
    
    clf.fit(X_train, y_train)
    
    print("\nEvaluating on Official Test Set...")
    y_pred = clf.predict(X_test)
    
    acc, prec, rec, f1, far, frr, cm = calculate_metrics(y_test, y_pred)
    
    print("\n--- LBP + SVM TEST RESULTS ---")
    print(f"Accuracy: {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall: {rec:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"FAR: {far:.4f}")
    print(f"FRR: {frr:.4f}")
    
    # Save the model
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    joblib.dump(clf, MODEL_SAVE_PATH)
    print(f"\nModel saved to {MODEL_SAVE_PATH}")
    
    # Save metrics
    metrics = {
        'model': 'LBP_SVM',
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1': float(f1),
        'far': float(far),
        'frr': float(frr),
        'confusion_matrix': cm
    }
    
    with open(METRICS_SAVE_PATH, 'w') as f:
        json.dump(metrics, f, indent=4)
        
    print(f"Metrics saved to {METRICS_SAVE_PATH}")

if __name__ == '__main__':
    main()
