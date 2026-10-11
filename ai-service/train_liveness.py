import os
import sys
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split

# Config
DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_model.h5')
METRICS_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'liveness_metrics.json')

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10  # Increased for fine-tuning

def load_nuaa_lists():
    print("[INFO] Loading NUAA dataset splits...")
    files = {
        'client_train': os.path.join(DATASET_DIR, 'client_train_face.txt'),
        'imposter_train': os.path.join(DATASET_DIR, 'imposter_train_face.txt'),
        'client_test': os.path.join(DATASET_DIR, 'client_test_face.txt'),
        'imposter_test': os.path.join(DATASET_DIR, 'imposter_test_face.txt')
    }
    
    for k, v in files.items():
        if not os.path.exists(v):
            print(f"[ERROR] Missing file: {v}")
            sys.exit(1)
            
    def read_file(filepath, label, prefix):
        data = []
        with open(filepath, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if not parts:
                    continue
                img_path = os.path.join(DATASET_DIR, prefix, parts[0])
                data.append({'filename': img_path, 'class': str(label)})
        return pd.DataFrame(data)

    # 1 = LIVE (Client), 0 = SPOOF (Imposter)
    df_client_train = read_file(files['client_train'], 1, 'ClientFace')
    df_imposter_train = read_file(files['imposter_train'], 0, 'ImposterFace')
    df_client_test = read_file(files['client_test'], 1, 'ClientFace')
    df_imposter_test = read_file(files['imposter_test'], 0, 'ImposterFace')
    
    df_train_full = pd.concat([df_client_train, df_imposter_train], ignore_index=True)
    df_test = pd.concat([df_client_test, df_imposter_test], ignore_index=True)
    
    # 20% validation split ONLY from training data
    df_train, df_val = train_test_split(
        df_train_full, test_size=0.2, random_state=42, stratify=df_train_full['class']
    )
    
    return df_train, df_val, df_test

def build_model():
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    
    # FINE-TUNING: Instead of freezing everything, unfreeze the top layers.
    # Liveness depends on low-level textures, so we train the last block of MobileNetV2.
    base_model.trainable = True
    # Freeze the first 100 layers
    for layer in base_model.layers[:100]:
        layer.trainable = False
        
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    # Use a lower learning rate because we are fine-tuning
    model.compile(optimizer=Adam(learning_rate=1e-4), loss='binary_crossentropy', metrics=['accuracy'])
    return model

def find_optimal_threshold(y_true, y_probs):
    """Finds the threshold that maximizes F1 score on validation data."""
    best_thresh = 0.5
    best_f1 = 0.0
    for thresh in np.arange(0.1, 0.9, 0.05):
        y_pred = (y_probs >= thresh).astype(int)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = thresh
    return best_thresh

def evaluate_metrics(y_true, y_pred, split_name=""):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    
    if cm.size == 4:
        tn, fp, fn, tp = cm.ravel()
    else:
        tn, fp, fn, tp = 0,0,0,0
        
    far = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    frr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    
    print(f"--- {split_name} Metrics ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"FAR:       {far:.4f}")
    print(f"FRR:       {frr:.4f}")
    print(f"TN: {tn}, FP: {fp}, FN: {fn}, TP: {tp}\n")
    
    return {
        'accuracy': float(acc), 'precision': float(prec), 'recall': float(rec),
        'f1_score': float(f1), 'far': float(far), 'frr': float(frr),
        'confusion_matrix': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)}
    }

def main():
    print("=== IMPROVED NUAA LIVENESS TRAINING ===")
    
    df_train, df_val, df_test = load_nuaa_lists()
    
    # Class weights for training (just in case, though NUAA train is fairly balanced)
    num_spoof = sum(df_train['class'] == '0')
    num_live = sum(df_train['class'] == '1')
    total = len(df_train)
    weight_for_0 = (1 / num_spoof) * (total / 2.0)
    weight_for_1 = (1 / num_live) * (total / 2.0)
    class_weight = {0: weight_for_0, 1: weight_for_1}
    print(f"[INFO] Class weights: {class_weight}")
    
    # Mild augmentation
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.1,
        horizontal_flip=True,
        brightness_range=[0.8, 1.2]  # Important for liveness texture
    )
    
    val_test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    
    train_gen = train_datagen.flow_from_dataframe(
        df_train, x_col='filename', y_col='class', target_size=IMG_SIZE,
        batch_size=BATCH_SIZE, class_mode='binary', shuffle=True
    )
    
    val_gen = val_test_datagen.flow_from_dataframe(
        df_val, x_col='filename', y_col='class', target_size=IMG_SIZE,
        batch_size=BATCH_SIZE, class_mode='binary', shuffle=False
    )
    
    test_gen = val_test_datagen.flow_from_dataframe(
        df_test, x_col='filename', y_col='class', target_size=IMG_SIZE,
        batch_size=BATCH_SIZE, class_mode='binary', shuffle=False
    )
    
    model = build_model()
    
    # Callbacks
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True, verbose=1),
        ModelCheckpoint(MODEL_SAVE_PATH, monitor='val_loss', save_best_only=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, verbose=1, min_lr=1e-6)
    ]
    
    print("[INFO] Starting fine-tuning...")
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    
    model.fit(
        train_gen, validation_data=val_gen, epochs=EPOCHS, 
        callbacks=callbacks, class_weight=class_weight
    )
    
    # The best weights are already restored by EarlyStopping and saved by ModelCheckpoint.
    # Now, find optimal threshold on validation set!
    print("[INFO] Finding optimal threshold on Validation set...")
    val_gen.reset()
    val_probs = model.predict(val_gen, verbose=1).flatten()
    val_true = val_gen.classes
    
    best_threshold = find_optimal_threshold(val_true, val_probs)
    print(f"[INFO] Optimal Validation Threshold: {best_threshold:.3f}")
    
    print("\n[INFO] Evaluating model on OFFICIAL TEST SET with optimal threshold...")
    test_gen.reset()
    test_probs = model.predict(test_gen, verbose=1).flatten()
    test_true = test_gen.classes
    
    test_pred = (test_probs >= best_threshold).astype(int)
    
    metrics = evaluate_metrics(test_true, test_pred, "OFFICIAL TEST SET")
    metrics['dataset_split'] = 'NUAA Official'
    metrics['optimal_threshold'] = float(best_threshold)
    
    with open(METRICS_SAVE_PATH, 'w') as f:
        json.dump(metrics, f, indent=4)
        
    print(f"[SUCCESS] Metrics saved to {METRICS_SAVE_PATH}")

if __name__ == '__main__':
    main()
