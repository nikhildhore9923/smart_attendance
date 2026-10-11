import os
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.applications.efficientnet import preprocess_input
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_efficientnetb0.h5')
METRICS_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'efficientnetb0_metrics.json')

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

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
                data.append({'filename': img_path, 'class': str(label)})
        return pd.DataFrame(data)

    df_client_train = read_file(files['client_train'], 1, 'ClientFace')
    df_imposter_train = read_file(files['imposter_train'], 0, 'ImposterFace')
    df_client_test = read_file(files['client_test'], 1, 'ClientFace')
    df_imposter_test = read_file(files['imposter_test'], 0, 'ImposterFace')
    
    df_train_full = pd.concat([df_client_train, df_imposter_train], ignore_index=True)
    df_test = pd.concat([df_client_test, df_imposter_test], ignore_index=True)
    
    # Validation split from training portion only
    df_train, df_val = train_test_split(
        df_train_full, test_size=0.2, random_state=42, stratify=df_train_full['class']
    )
    return df_train, df_val, df_test

def calculate_metrics(y_true, y_pred):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0,0,0,0)
    far = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    frr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    return acc, prec, rec, f1, far, frr, cm

def main():
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    
    df_train, df_val, df_test = load_nuaa_lists()
    print(f"Train: {len(df_train)}, Val: {len(df_val)}, Test: {len(df_test)}")
    
    # Class weights for training
    classes = df_train['class'].astype(int).values
    weights = compute_class_weight('balanced', classes=np.unique(classes), y=classes)
    class_weight_dict = {0: weights[0], 1: weights[1]}
    print(f"Class Weights: {class_weight_dict}")
    
    # Augmentation for training only
    # EfficientNet in tf.keras includes rescaling natively in its architecture, 
    # so we just pass preprocess_input which passes inputs cleanly.
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )
    val_test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    
    train_gen = train_datagen.flow_from_dataframe(df_train, x_col='filename', y_col='class', target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=True)
    val_gen = val_test_datagen.flow_from_dataframe(df_val, x_col='filename', y_col='class', target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=False)
    test_gen = val_test_datagen.flow_from_dataframe(df_test, x_col='filename', y_col='class', target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=False)
    
    print("\n--- PHASE 1: Training Classification Head ---")
    base_model = EfficientNetB0(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    base_model.trainable = False
        
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(optimizer=Adam(learning_rate=1e-3), loss='binary_crossentropy', metrics=['accuracy'])
    
    model.fit(
        train_gen, 
        validation_data=val_gen, 
        epochs=3, 
        class_weight=class_weight_dict
    )
    
    print("\n--- PHASE 2: Fine-Tuning Later Layers ---")
    # Unfreeze top layers (~last 30 layers)
    for layer in base_model.layers[-30:]:
        # Avoid unfreezing BN layers to prevent moving mean/var shift
        if not isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = True
            
    model.compile(optimizer=Adam(learning_rate=1e-4), loss='binary_crossentropy', metrics=['accuracy'])
    
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=4, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, verbose=1),
        ModelCheckpoint(MODEL_SAVE_PATH, monitor='val_loss', save_best_only=True, verbose=1)
    ]
    
    model.fit(
        train_gen, 
        validation_data=val_gen, 
        epochs=12, 
        callbacks=callbacks,
        class_weight=class_weight_dict
    )
    
    print("\n--- FINDING OPTIMAL THRESHOLD (Validation Set) ---")
    val_gen.reset()
    val_probs = model.predict(val_gen, verbose=1).flatten()
    val_labels = val_gen.classes
    best_thresh, best_f1 = 0.5, 0.0
    
    for thresh in np.arange(0.1, 0.9, 0.05):
        y_val_pred = (val_probs >= thresh).astype(int)
        f1 = f1_score(val_labels, y_val_pred, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = thresh
            
    print(f"Optimal Validation Threshold: {best_thresh:.2f} (Val F1: {best_f1:.4f})")
    
    print("\n--- EVALUATING ON OFFICIAL TEST SET ---")
    test_gen.reset()
    test_probs = model.predict(test_gen, verbose=1).flatten()
    y_true = test_gen.classes
    num_live = sum(y_true)
    num_spoof = len(y_true) - num_live
    
    print(f"Test Set counts: {num_live} LIVE, {num_spoof} SPOOF")
    
    # 1. Eval with thresh = 0.5
    y_pred_05 = (test_probs >= 0.5).astype(int)
    a1, p1, r1, f1_1, far1, frr1, cm1 = calculate_metrics(y_true, y_pred_05)
    
    # 2. Eval with best val thresh
    y_pred_opt = (test_probs >= best_thresh).astype(int)
    a2, p2, r2, f1_2, far2, frr2, cm2 = calculate_metrics(y_true, y_pred_opt)
    
    print("\n[Results @ Threshold 0.5]")
    print(f"Accuracy: {a1:.4f} | FAR: {far1:.4f} | FRR: {frr1:.4f} | F1: {f1_1:.4f}")
    
    print(f"\n[Results @ Threshold {best_thresh:.2f}]")
    print(f"Accuracy: {a2:.4f} | FAR: {far2:.4f} | FRR: {frr2:.4f} | F1: {f1_2:.4f}")
    
    # Save Metrics
    metrics = {
        'model': 'EfficientNetB0',
        'test_counts': {'live': int(num_live), 'spoof': int(num_spoof)},
        'threshold_0.5': {
            'accuracy': float(a1), 'precision': float(p1), 'recall': float(r1), 'f1': float(f1_1),
            'far': float(far1), 'frr': float(frr1),
            'confusion_matrix': {'tn': int(cm1.ravel()[0]), 'fp': int(cm1.ravel()[1]), 'fn': int(cm1.ravel()[2]), 'tp': int(cm1.ravel()[3])}
        },
        'optimal_threshold': float(best_thresh),
        'threshold_optimal': {
            'accuracy': float(a2), 'precision': float(p2), 'recall': float(r2), 'f1': float(f1_2),
            'far': float(far2), 'frr': float(frr2),
            'confusion_matrix': {'tn': int(cm2.ravel()[0]), 'fp': int(cm2.ravel()[1]), 'fn': int(cm2.ravel()[2]), 'tp': int(cm2.ravel()[3])}
        }
    }
    
    with open(METRICS_SAVE_PATH, 'w') as f:
        json.dump(metrics, f, indent=4)
    print(f"\nMetrics saved to {METRICS_SAVE_PATH}")

if __name__ == '__main__':
    main()
