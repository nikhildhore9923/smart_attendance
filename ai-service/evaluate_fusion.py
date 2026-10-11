import os
import json
import cv2
import numpy as np
import pandas as pd
from skimage.feature import local_binary_pattern
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications.efficientnet import preprocess_input
import joblib

DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"
EFF_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')
LBP_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_lbp_svm.pkl')
RESULTS_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'fusion_metrics.json')

LBP_RADIUS = 1
LBP_POINTS = 8 * LBP_RADIUS
LBP_METHOD = 'uniform'

def load_nuaa_splits():
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
    
    df_train_full = pd.concat([df_client_train, df_imposter_train], ignore_index=True)
    df_test = pd.concat([df_client_test, df_imposter_test], ignore_index=True)
    
    df_train, df_val = train_test_split(
        df_train_full, test_size=0.2, random_state=42, stratify=df_train_full['class']
    )
    return df_val, df_test

def extract_lbp_features(image_path):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    img = cv2.resize(img, (64, 64))
    lbp = local_binary_pattern(img, LBP_POINTS, LBP_RADIUS, LBP_METHOD)
    n_bins = int(lbp.max() + 1)
    hist, _ = np.histogram(lbp.ravel(), bins=n_bins, range=(0, n_bins))
    hist = hist.astype("float")
    hist /= (hist.sum() + 1e-7)
    return hist

def prepare_lbp_data(df):
    X, y = [], []
    for idx, row in df.iterrows():
        features = extract_lbp_features(row['filename'])
        if features is not None:
            X.append(features)
            y.append(row['class'])
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

def get_eff_probs(model, df):
    df_str = df.copy()
    df_str['class'] = df_str['class'].astype(str)
    datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    gen = datagen.flow_from_dataframe(
        df_str, x_col='filename', y_col='class', 
        target_size=(224, 224), batch_size=32, 
        class_mode='binary', shuffle=False
    )
    probs = model.predict(gen, verbose=1).flatten()
    return probs, gen.classes

def main():
    print("Loading data splits (Val, Test)...")
    df_val, df_test = load_nuaa_splits()
    
    print("\nLoading EfficientNet...")
    eff_model = load_model(EFF_MODEL_PATH)
    print("Getting EfficientNet Validation probabilities...")
    eff_val_probs, val_labels_eff = get_eff_probs(eff_model, df_val)
    print("Getting EfficientNet Test probabilities...")
    eff_test_probs, test_labels_eff = get_eff_probs(eff_model, df_test)
    
    print("\nLoading LBP-SVM...")
    lbp_model = joblib.load(LBP_MODEL_PATH)
    # Validate probability meaning: the SVM classes_ attribute shows class order
    print(f"LBP SVM classes order: {lbp_model.classes_}") 
    # classes_ is usually [0, 1] so index 1 is class 1 (LIVE)
    
    print("Getting LBP Validation probabilities...")
    X_val_lbp, val_labels_lbp = prepare_lbp_data(df_val)
    lbp_val_probs = lbp_model.predict_proba(X_val_lbp)[:, 1]
    
    print("Getting LBP Test probabilities...")
    X_test_lbp, test_labels_lbp = prepare_lbp_data(df_test)
    lbp_test_probs = lbp_model.predict_proba(X_test_lbp)[:, 1]
    
    # Assert labels match
    assert np.array_equal(val_labels_eff, val_labels_lbp)
    assert np.array_equal(test_labels_eff, test_labels_lbp)
    
    val_labels = val_labels_eff
    test_labels = test_labels_eff
    
    print("\n--- STEP 1: VALIDATION THRESHOLD OPTIMIZATION ---")
    
    best_config = None
    best_f1 = 0.0
    best_balanced = None
    min_far_diff = 1.0
    
    # We want a configuration with good F1 but we explicitly want to reduce FAR
    # We'll calculate all and find the one that balances them best but prioritizes FAR
    
    alphas = np.arange(0.0, 1.1, 0.1)
    thresholds = np.arange(0.1, 0.95, 0.05)
    
    configs = []
    for alpha in alphas:
        fused_val_probs = alpha * eff_val_probs + (1.0 - alpha) * lbp_val_probs
        
        for thresh in thresholds:
            y_val_pred = (fused_val_probs >= thresh).astype(int)
            acc, prec, rec, f1, far, frr, _ = calculate_metrics(val_labels, y_val_pred)
            
            configs.append({
                'alpha': alpha,
                'threshold': thresh,
                'f1': f1,
                'far': far,
                'frr': frr,
                'acc': acc
            })
            
    # The user asked: "Choose the best fusion configuration based on a reasonable balance 
    # between FAR and FRR, with particular attention to reducing FAR because this is an anti-spoofing attendance system."
    
    # First, let's filter configs that have FAR <= FRR (prioritizing strictness)
    strict_configs = [c for c in configs if c['far'] <= c['frr'] and c['far'] < 0.20]
    
    if not strict_configs:
        # fallback
        strict_configs = configs
        
    # Among strict configs, pick the one with highest F1
    strict_configs.sort(key=lambda x: x['f1'], reverse=True)
    best_config = strict_configs[0]
    
    selected_alpha = best_config['alpha']
    selected_thresh = best_config['threshold']
    
    print(f"Selected Configuration (from Val):")
    print(f"Alpha: {selected_alpha:.1f} (Weight for EfficientNet)")
    print(f"Threshold: {selected_thresh:.2f}")
    print(f"Val F1: {best_config['f1']:.4f} | Val FAR: {best_config['far']:.4f} | Val FRR: {best_config['frr']:.4f}")
    
    print("\n--- STEP 2: OFFICIAL TEST ---")
    fused_test_probs = selected_alpha * eff_test_probs + (1.0 - selected_alpha) * lbp_test_probs
    y_test_pred = (fused_test_probs >= selected_thresh).astype(int)
    
    acc, prec, rec, f1, far, frr, cm = calculate_metrics(test_labels, y_test_pred)
    
    print(f"Accuracy: {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall: {rec:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"FAR: {far:.4f}")
    print(f"FRR: {frr:.4f}")
    
    # Save results
    results = {
        'selected_alpha': float(selected_alpha),
        'selected_threshold': float(selected_thresh),
        'val_metrics': {
            'f1': float(best_config['f1']),
            'far': float(best_config['far']),
            'frr': float(best_config['frr'])
        },
        'test_metrics': {
            'accuracy': float(acc),
            'precision': float(prec),
            'recall': float(rec),
            'f1': float(f1),
            'far': float(far),
            'frr': float(frr),
            'confusion_matrix': cm
        }
    }
    
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    with open(RESULTS_PATH, 'w') as f:
        json.dump(results, f, indent=4)
        
    print(f"\nFusion metrics saved to {RESULTS_PATH}")

if __name__ == '__main__':
    main()
