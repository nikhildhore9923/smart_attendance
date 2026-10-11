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
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split

DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'anti_spoof_model.h5')
METRICS_SAVE_PATH = os.path.join(os.path.dirname(__file__), 'models', 'liveness', 'liveness_metrics.json')

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 8

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
    
    df_train, df_val = train_test_split(
        df_train_full, test_size=0.2, random_state=42, stratify=df_train_full['class']
    )
    return df_train, df_val, df_test

def build_model():
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    # FREEZE ENTIRE BASE MODEL (Fine-tuning overfit massive on NUAA test backgrounds)
    base_model.trainable = False
        
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(optimizer=Adam(learning_rate=1e-3), loss='binary_crossentropy', metrics=['accuracy'])
    return model

def main():
    df_train, df_val, df_test = load_nuaa_lists()
    
    # Very aggressive augmentation to prevent memorizing lighting
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.2,
        shear_range=0.2,
        horizontal_flip=True,
        brightness_range=[0.5, 1.5],
        fill_mode='nearest'
    )
    val_test_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    
    train_gen = train_datagen.flow_from_dataframe(df_train, x_col='filename', y_col='class', target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=True)
    val_gen = val_test_datagen.flow_from_dataframe(df_val, x_col='filename', y_col='class', target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=False)
    test_gen = val_test_datagen.flow_from_dataframe(df_test, x_col='filename', y_col='class', target_size=IMG_SIZE, batch_size=BATCH_SIZE, class_mode='binary', shuffle=False)
    
    model = build_model()
    
    callbacks = [
        EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True, verbose=1),
        ModelCheckpoint(MODEL_SAVE_PATH, monitor='val_loss', save_best_only=True, verbose=1)
    ]
    
    model.fit(train_gen, validation_data=val_gen, epochs=EPOCHS, callbacks=callbacks)
    
    # Find best threshold on validation
    val_gen.reset()
    val_probs = model.predict(val_gen, verbose=1).flatten()
    best_thresh, best_f1 = 0.5, 0.0
    for thresh in np.arange(0.1, 0.9, 0.05):
        f1 = f1_score(val_gen.classes, (val_probs >= thresh).astype(int), zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = thresh
            
    print(f"Optimal Validation Threshold: {best_thresh}")
    
    # Evaluate
    test_gen.reset()
    test_probs = model.predict(test_gen, verbose=1).flatten()
    y_pred = (test_probs >= best_thresh).astype(int)
    y_true = test_gen.classes
    
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0,0,0,0)
    far = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    frr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    
    metrics = {
        'accuracy': float(acc), 'precision': float(prec), 'recall': float(rec), 'f1_score': float(f1),
        'far': float(far), 'frr': float(frr), 'optimal_threshold': float(best_thresh),
        'confusion_matrix': {'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)},
        'dataset_split': 'NUAA Official'
    }
    
    with open(METRICS_SAVE_PATH, 'w') as f:
        json.dump(metrics, f, indent=4)
    print(f"Accuracy: {acc:.4f}, FAR: {far:.4f}, FRR: {frr:.4f}")

if __name__ == '__main__':
    main()
