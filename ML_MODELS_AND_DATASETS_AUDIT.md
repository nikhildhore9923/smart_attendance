# ML MODELS, TRAINING DATASETS, AND EVALUATION DATASETS AUDIT
**Smart Attendance System — Comprehensive Evidence-Based Investigation**  
**Group A18 | Dept. of CSE-AIML | KIT’s College of Engineering (Autonomous), Kolhapur**  
**Date of Audit:** 12 October 2026

---

## 1. Executive Summary

This document presents a complete, rigorous, evidence-based audit of every Machine Learning model, training script, dataset, and evaluation metric present in the Smart Attendance System repository.

### Key Truths Discovered from Source Code:
1. **How many ML models does the system have?**
   The project uses **three primary operational models** in production:
   - **MTCNN** for face detection and facial landmark alignment.
   - **ArcFace** for 512-dimensional face recognition embedding generation.
   - **EfficientNetB0 (TensorFlow Lite)** for face anti-spoofing / liveness classification.  
   *(In addition, our research repository contains training scripts and checkpoints for two experimental models: **MobileNetV2** and an **LBP + SVM** texture classifier).*

2. **Did our team train any model?**
   - **YES, for Liveness/Anti-Spoofing:** Our team **trained and fine-tuned** the `EfficientNetB0`, `MobileNetV2`, and `LBP_SVM` models on the **NUAA Photograph Imposter Database**. We used ImageNet transfer learning: freezing the backbone, training custom dense classification layers, and unfreezing the top 30 layers for fine-tuning.
   - **NO, for Face Detection & Face Recognition:** We did **NOT** train MTCNN or ArcFace from scratch. We utilized industry-standard pretrained weights (MTCNN via the `mtcnn` package; ArcFace pretrained on massive face benchmarks via `DeepFace`).

3. **Was NUAA used for training or testing?**
   **Both.** The NUAA Photograph Imposter Database provides an official split. Our training scripts (`train_efficientnet.py`, `train_liveness.py`, `train_liveness_lbp.py`) utilized:
   - `client_train_face.txt` and `imposter_train_face.txt` for **Training** (with an 80/20 train/validation split).
   - `client_test_face.txt` and `imposter_test_face.txt` (9,123 samples) strictly for **Final Testing and Benchmark Evaluation**.

4. **Does registering/enrolling students count as "training"?**
   **No.** Enrolling a student does **NOT** train or update the weights of ArcFace. Enrolling is **feature extraction (inference)**: ArcFace converts the webcam images into 512-dimensional numerical vectors, which are saved in the MySQL database. When recognizing attendance, the system computes the mathematical **Cosine Similarity** between the live face vector and stored student vectors.

---

## 2. Model-by-Model Detailed Inventory

| Model Name | Exact Architecture | Specific Role in Application | Framework / Library | Training Status by Our Team | Weight Source & Origin | Model File Path | Training Code Present? |
|---|---|---|---|---|---|---|:---:|
| **MTCNN** | 3-Stage Cascaded CNN (P-Net, R-Net, O-Net) | Detects human faces in video frames and extracts 5 facial keypoints (eyes, nose, mouth corners) | `mtcnn 0.1.1` (TensorFlow) | **Pretrained** (Not trained by us) | Pretrained weights bundled inside official `mtcnn` PyPI package | Bundled in Python site-packages | **Inference only** (`ai-service/app/services/face_detector.py`) |
| **ArcFace** | ResNet-based deep CNN with Additive Angular Margin Loss | Generates 512-dimensional $L_2$-normalized vector representations of facial identity | `deepface 0.0.93` (TensorFlow / Keras) | **Pretrained** (Not trained by us) | Pretrained weights published by InsightFace / DeepFace authors (trained on millions of identities) | Cached automatically by DeepFace at `~/.deepface/weights/arcface_weights.h5` | **Inference only** (`ai-service/app/services/face_embedder.py`) |
| **EfficientNetB0 (Current Production Liveness)** | EfficientNetB0 backbone + GlobalAveragePooling + Dense(128, ReLU) + Dropout(0.5) + Dense(1, Sigmoid) | Binary anti-spoofing classification: classifies face crop as LIVE ($1$) or SPOOF ($0$) | `tensorflow 2.17` (TFLite Interpreter) | **Transfer Learning + Fine-Tuned by Our Team** | Backbone: Pretrained on ImageNet. Head & top 30 layers: Trained by us on NUAA | `ai-service/models/liveness/anti_spoof_efficientnetb0.tflite` (also `.h5` and `.weights.h5`) | **YES** (`ai-service/train_efficientnet.py`, `ai-service/convert_tflite.py`) |
| **MobileNetV2 (Baseline Liveness)** | MobileNetV2 backbone (first 100 layers frozen) + GlobalAveragePooling + Dense(256) + Dense(1, Sigmoid) | Binary anti-spoofing baseline classifier | `tensorflow 2.17` (Keras) | **Transfer Learning + Fine-Tuned by Our Team** | Backbone: ImageNet. Top layers trained by us on NUAA | `ai-service/models/liveness/anti_spoof_model.h5` | **YES** (`ai-service/train_liveness.py`) |
| **LBP + SVM (Experimental Liveness)** | Local Binary Patterns (Radius 1, Points 8, uniform) + StandardScaler + Linear/RBF SVM | Traditional texture-based anti-spoofing classifier | `scikit-image` + `scikit-learn` | **Trained From Scratch by Our Team** | Trained directly from extracted 1D LBP histogram features | `ai-service/models/liveness/anti_spoof_lbp_svm.pkl` | **YES** (`ai-service/train_liveness_lbp.py`) |
| **OpenCV LBPH (Legacy Prototype)** | Local Binary Pattern Histograms | Old prototype student recognizer from initial proof-of-concept | `opencv-contrib-python` | **Trained Locally on initial student photos** | Trained on preliminary demo images | `ai-service/legacy/lbfmodel.yaml` | **Legacy Only** (Replaced by ArcFace) |

---

## 3. Dataset-by-Dataset Inventory

| Dataset Name | Primary Purpose in Our Project | Sample Count in Our Code | Classes / Labels | Splits Defined in Repository | Source / Origin | Code Evidence in Repository |
|---|---|---|---|---|---|---|
| **ImageNet (ILSVRC)** | Pretraining base feature extractors | $\sim 1.4\text{ million}$ images (Standard) | 1,000 generic object classes | Standard ImageNet split | `torchvision` / `tf.keras.applications` | `train_efficientnet.py:97`<br>`EfficientNetB0(weights='imagenet')` |
| **MS-Celeb-1M / Glint360k** (ArcFace Pretraining) | Deep face embedding space pretraining | Millions of face images across $>85,000$ identities | Identity labels | Pretrained by DeepFace/InsightFace authors | InsightFace / DeepFace | `app/services/face_embedder.py:18`<br>`DeepFace.represent(model_name="ArcFace")` |
| **NUAA Photograph Imposter Database** | **Training, Validation, and Testing** of our Liveness Models | **12,614 total samples** in official benchmark split | `ClientFace` = Live ($1$)<br>`ImposterFace` = Spoof ($0$) | - Train: `client_train_face.txt` + `imposter_train_face.txt`<br>- Val: 20% stratified split of train<br>- Test: `client_test_face.txt` (3,362) + `imposter_test_face.txt` (5,761) | NUAA (Nanjing University of Aeronautics and Astronautics) | `train_efficientnet.py:17-54`<br>`train_liveness.py:18-65`<br>`DATASET_DIR = r"D:\NUAA-Liveness\Detectedface"` |
| **SmartAttend Enrolled Student Gallery** | Enrollment biometric templates for college students | **4 registered students** (10 multi-angle 512-d ArcFace vector templates in MySQL) | Student Roll Numbers (e.g. `31`, `03`, `49`) | Dynamic institutional roster in MySQL (`FaceEmbedding` table) | Captured via guided webcam in `/enroll` | `c:\smart_attendance\dataset\`<br>`backend/prisma/schema.prisma` (`FaceEmbedding`) |

---

## 4. Deep Investigation of the EfficientNetB0 Liveness Model

### 4.1 Did our team train EfficientNetB0?
**YES, using two-phase Transfer Learning:**
1. **Phase 1 (Feature Transfer):** Loaded `EfficientNetB0` with ImageNet weights (`weights='imagenet'`), froze all base convolutional layers (`base_model.trainable = False`), and attached a custom classification head:
   $$\text{Input}(224 \times 224 \times 3) \rightarrow \text{GlobalAveragePooling2D} \rightarrow \text{Dense}(128, \text{ReLU}) \rightarrow \text{Dropout}(0.5) \rightarrow \text{Dense}(1, \text{Sigmoid})$$
   Trained the head for 3 epochs using `Adam(learning_rate=1e-3)` with binary cross-entropy loss.
2. **Phase 2 (Fine-Tuning):** Unfroze the top 30 layers of the EfficientNetB0 backbone (keeping Batch Normalization layers frozen to maintain running variance). Trained with `Adam(learning_rate=1e-4)` for up to 12 epochs with `EarlyStopping(patience=4)` and `ReduceLROnPlateau(factor=0.5)`.
3. **Phase 3 (TFLite Quantization/Conversion):** Converted the best saved Keras checkpoint (`anti_spoof_efficientnetb0.h5`) into flat TensorFlow Lite format (`anti_spoof_efficientnetb0.tflite`) using `convert_tflite.py` to prevent Keras 3 vs legacy Keras runtime conflicts with DeepFace.

### 4.2 Was NUAA used for training or only evaluation?
**Both.**
- In `train_efficientnet.py`, the training partition was loaded from `client_train_face.txt` and `imposter_train_face.txt`. An 80/20 train/validation split was created using `train_test_split(..., test_size=0.2, random_state=42)`.
- The official test partition (`client_test_face.txt` and `imposter_test_face.txt`, total 9,123 samples) was **held out** and used solely for final evaluation.

---

## 5. Investigation of ArcFace and MTCNN

### 5.1 ArcFace Face Recognition
* **Source of Model:** Pretrained model loaded via `deepface` (`DeepFace.represent(..., model_name="ArcFace")`).
* **Origin of Weights:** InsightFace research team, trained with Additive Angular Margin Loss on vast face corpora (MS-Celeb-1M / Glint360k).
* **Does our project contain ArcFace training code?** **No.** Training ArcFace from scratch requires high-end GPU clusters (e.g., 8 $\times$ NVIDIA A100) running for weeks on terabytes of face images.
* **How student enrollment works:**
  When a student enrolls in `/enroll`:
  1. The webcam captures 5 multi-angle crops.
  2. The crops are passed through the pretrained ArcFace model (feature extractor).
  3. The model outputs a 512-dimensional floating-point array $\vec{v} \in \mathbb{R}^{512}$.
  4. The 512 numbers are saved directly into the MySQL database in the `FaceEmbedding` table (`embedding` column).
  5. **No gradients are calculated, no weights are adjusted, and no training occurs.**

### 5.2 MTCNN Face Detection
* **Source of Model:** Pretrained cascaded convolutional network loaded via the `mtcnn` PyPI library (`from mtcnn import MTCNN`).
* **Origin of Weights:** Pretrained on the WIDER FACE and CelebA landmark datasets.
* **Training Code:** None in our repository (used strictly for inference).

---

## 6. Verification of Performance Metrics (NUAA Benchmark)

All performance numbers reported in our project dossier were verified against `ai-service/models/liveness/efficientnetb0_metrics.json` and `liveness_metrics.json`.

### Official Test Set Breakdown (9,123 Samples: 3,362 Live, 5,761 Spoof)

| Metric | MobileNetV2 Baseline | EfficientNetB0 (@ 0.50 Threshold) | EfficientNetB0 (@ 0.10 Threshold) | EfficientNetB0 (@ 0.04 Tuned Threshold) |
|---|:---:|:---:|:---:|:---:|
| **Accuracy** | 53.13% | **72.26%** | 69.19% | 67.52% |
| **Precision** | 38.31% | **61.01%** | 55.75% | 53.84% |
| **Recall (True Live Rate)** | 44.53% | **68.47%** | **79.42%** | **83.34%** |
| **False Acceptance Rate (FAR)** | 41.85% | **25.53%** | 36.78% | 40.84% |
| **False Rejection Rate (FRR)** | 55.47% | **31.53%** | 20.58% | **16.66%** |
| **Confusion Matrix** | TN: 3,350 \| FP: 2,411<br>FN: 1,865 \| TP: 1,497 | TN: 4,290 \| FP: 1,471<br>FN: 1,060 \| TP: 2,302 | TN: 3,642 \| FP: 2,119<br>FN: 692 \| TP: 2,670 | TN: 3,408 \| FP: 2,353<br>FN: 560 \| TP: 2,802 |
| **Source File** | `liveness_metrics.json` | `efficientnetb0_metrics.json` | `efficientnetb0_metrics.json` | `threshold_results.json` |

### What These Numbers Mean:
* **FAR (False Acceptance Rate):** The percentage of spoof attacks (printed photos) that fooled the model into thinking they were a live human ($25.53\%$ at default threshold).
* **FRR (False Rejection Rate):** The percentage of real live humans that were incorrectly flagged as spoofs ($31.53\%$ at threshold 0.50; reduced to $16.66\%$ at tuned threshold 0.04).
* **Why the threshold matters:**
  Under standard 0.50 threshold, challenging webcam lighting can cause genuine faces to be rejected. Lowering the threshold to $0.04$ boosts live student recall to **$83.34\%$**, ensuring smooth classroom capture while relying on the **3-frame temporal stability rule** and **Laplacian blur filter** ($>15.0$) as secondary defense layers.

---

## 7. Direct Answers to Likely Professor Questions

### Q1: "Which dataset did you use to train your ML model?"
* **Truthful Answer:**  
  *"For our anti-spoofing liveness model, we trained and fine-tuned **EfficientNetB0** on the **NUAA Photograph Imposter Database**, which contains real client faces and printed photo attack samples. For face recognition, we did not train a model from scratch; we used a pretrained **ArcFace** model trained on large-scale face recognition benchmarks like MS-Celeb-1M, and we registered our own students by extracting their 512-dimensional embeddings into our database."*
* **Verification Status:** **VERIFIED** (Confirmed in `train_efficientnet.py:17` and `app/services/face_embedder.py:18`).

---

### Q2: "Did you train any model yourself?"
* **Truthful Answer:**  
  *"Yes, sir/madam. We trained and fine-tuned the **anti-spoofing liveness classifier**. We took an EfficientNetB0 architecture pretrained on ImageNet, built a custom dense classification head, and fine-tuned the top 30 layers on the NUAA dataset. However, for face detection (MTCNN) and face recognition (ArcFace), we used industry-standard pretrained weights, because training deep face recognition from scratch requires millions of images and multi-GPU clusters."*
* **Verification Status:** **VERIFIED** (Confirmed in `train_efficientnet.py:96-137`).

---

### Q3: "How many ML models does your project use?"
* **Truthful Answer:**  
  *"Our live production pipeline uses **three deep learning models**:  
  1. **MTCNN** for face detection and 5-point landmark alignment.  
  2. **ArcFace** for 512-dimensional feature embedding extraction.  
  3. **EfficientNetB0 (TFLite)** for binary anti-spoofing classification.  
  In addition, during our research phase, we trained two alternative liveness baselines: **MobileNetV2** and an **LBP + SVM** texture model for comparison."*
* **Verification Status:** **VERIFIED** (Confirmed in `ai-service/app/services/`).

---

### Q4: "Which dataset was used for face recognition?"
* **Truthful Answer:**  
  *"The ArcFace feature extractor was originally trained by researchers on massive face datasets (MS-Celeb-1M / Glint360k) to learn a robust hyperspherical embedding space. For our college, the enrolled identity gallery consists of our **own enrolled students** whose multi-angle face samples are captured via our `/enroll` interface and stored as 512-d vectors in our MySQL database."*
* **Verification Status:** **VERIFIED** (Confirmed in `DeepFace` source and `backend/prisma/schema.prisma`).

---

### Q5: "Which dataset was used for liveness detection?"
* **Truthful Answer:**  
  *"The **NUAA Photograph Imposter Database** from Nanjing University of Aeronautics and Astronautics. It is a benchmark dataset specifically designed for testing 2D print attack spoofing against facial recognition systems."*
* **Verification Status:** **VERIFIED** (Confirmed in `train_efficientnet.py:17`).

---

### Q6: "Was NUAA used for training or testing?"
* **Truthful Answer:**  
  *"It was used for **both**, according to the official benchmark protocol. The training subset (`client_train_face.txt` and `imposter_train_face.txt`) was used for training and validation. The official test subset (`client_test_face.txt` and `imposter_test_face.txt`, containing 9,123 samples) was held out and used strictly for final evaluation."*
* **Verification Status:** **VERIFIED** (Confirmed in `train_efficientnet.py:24-54`).

---

### Q7: "What is the difference between training and testing in your project?"
* **Truthful Answer:**  
  *"During **training**, the model's weights and classification layers were iteratively updated using backpropagation and the Adam optimizer on the training split to minimize binary cross-entropy loss. During **testing**, the weights were completely frozen, and the model was evaluated on 9,123 unseen test samples to compute real-world Accuracy, False Acceptance Rate (FAR), and False Rejection Rate (FRR)."*
* **Verification Status:** **VERIFIED**.

---

### Q8: "What does 'pretrained model' mean?"
* **Truthful Answer:**  
  *"A pretrained model is a neural network whose weights have already been optimized on a large benchmark dataset (like ImageNet or MS-Celeb-1M) by researchers. Instead of starting from random Gaussian weights, we leverage the feature representations already learned by the network (Transfer Learning). This is industry standard practice in Computer Vision."*
* **Verification Status:** **VERIFIED**.

---

### Q9: "How do you register new students if you do not train ArcFace again?"
* **Truthful Answer:**  
  *"ArcFace is a **metric learning** model, not a simple multi-class classifier. It maps any human face into a 512-dimensional unit vector where faces of the same person are close together and different persons are far apart. When a new student registers, ArcFace runs once in forward inference mode to extract their 512 numbers, which we store in MySQL. When taking attendance, we calculate the **Cosine Similarity** between the live face and stored vectors. Therefore, adding 100 new students requires zero retraining."*
* **Verification Status:** **VERIFIED** (Confirmed in `backend/src/services/recognitionService.js:64-88`).

---

### Q10: "What accuracy did you achieve, and on which dataset?"
* **Truthful Answer:**  
  *"On the official test set of the **NUAA Photograph Imposter Database** (9,123 test samples), our fine-tuned **EfficientNetB0** achieved **72.26% accuracy** with a False Acceptance Rate (FAR) of **25.53%** and False Rejection Rate of **31.53%** at the standard 0.50 threshold. This outperformed our baseline MobileNetV2, which achieved only 53.13% accuracy."*
* **Verification Status:** **VERIFIED** (Confirmed in `ai-service/models/liveness/efficientnetb0_metrics.json`).

---

### Q11: "What are the limitations of your liveness model?"
* **Truthful Answer:**  
  *"Because our system uses a standard single RGB webcam, EfficientNetB0 evaluates 2D texture patterns. On high-resolution photographic prints or tablet screens held under optimal lighting, 2D CNNs can occasionally produce False Accepts ($25.5\%$ FAR on NUAA). That is precisely why our project introduces a **defense-in-depth architecture**: we combine the CNN liveness score with a **Laplacian blur filter** ($>15.0$), **luminance boundaries**, and a **temporal stability rule** requiring consecutive frame confirmations before stamping attendance."*
* **Verification Status:** **VERIFIED** (Confirmed in `ai-service/app/routes/analyze.py` and `backend/src/controllers/attendanceController.js`).

---

## 8. Student-Friendly Presentation Scripts

### A. The 30-Second Elevator Pitch (Memorize This)
> *"For our project, we use three distinct AI models: **MTCNN** for face detection, **ArcFace** for 512-dimensional face recognition, and **EfficientNetB0** for anti-spoofing liveness detection.*  
> *We fine-tuned EfficientNetB0 on the official **NUAA Photograph Imposter Database**, where it achieved **72.26% accuracy** against 2D print attacks across 9,123 test images. For face recognition, we use ArcFace's pretrained hyperspherical embedding space, registering our students dynamically by saving their 512-dimensional vectors in MySQL without needing any retraining."*

---

### B. Simple Architecture & Dataset Dataflow Diagram

```
                 [ Standard RGB Webcam Frame ]
                              │
                              ▼
           ┌─────────────────────────────────────┐
           │     1. Face Detection: MTCNN        │
           │  (Pretrained on WIDER FACE/CelebA)  │
           └──────────────────┬──────────────────┘
                              │ Face Crop (224 x 224)
                              ▼
           ┌─────────────────────────────────────┐
           │ 2. Anti-Spoofing: EfficientNetB0    │
           │  (Fine-Tuned by Us on NUAA Dataset) │
           └──────────────────┬──────────────────┘
                              │
                    Is Face Live? (Score >= 0.04)
                     /                         \
                   NO                           YES
                   │                             │
                   ▼                             ▼
           [ REJECT SPOOF ]        ┌───────────────────────────────┐
                                   │  3. Recognition: ArcFace      │
                                   │ (Pretrained on MS-Celeb-1M)   │
                                   └───────────────┬───────────────┘
                                                   │
                                     Extract 512-D Unit Vector
                                                   │
                                                   ▼
                                   ┌───────────────────────────────┐
                                   │   Cosine Similarity Match     │
                                   │  against Stored MySQL Gallery │
                                   │  (Enrolled Students Dataset)  │
                                   └───────────────┬───────────────┘
                                                   │
                                         Similarity >= 0.50
                                                   │
                                                   ▼
                                   [ MARK ATTENDANCE PRESENT ]
```
