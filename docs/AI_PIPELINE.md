# AI Pipeline

## Architecture Overview
The AI Pipeline is exposed as a Python internal microservice. It receives images (or base64 strings) from the Node.js backend and returns structured JSON responses.

## Pipeline Stages

### 1. Face Detection (MTCNN)
- **Model**: Multi-task Cascaded Convolutional Networks (MTCNN).
- **Purpose**: Accurately detect multiple faces in a frame, handle partial occlusions, and output bounding boxes + 5-point facial landmarks.
- **Output**: Array of cropped faces, bounding boxes, and detection confidence.

### 2. Face Quality Analysis
- **Purpose**: Filter out blurred or poorly lit faces before processing further.
- **Metrics**:
  - Variance of Laplacian (Blur detection).
  - Average pixel intensity (Brightness detection).
  - Minimum face resolution (e.g., >= 80x80 pixels).
- **Output**: Quality status (`GOOD`, `POOR`, `UNCERTAIN`).

### 3. Liveness / Anti-Spoofing
- **Model**: Deep Learning based Anti-spoofing CNN (e.g., Silent-Face-Anti-Spoofing or a MobileNetV2 trained on CASIA-FASD).
- **Purpose**: Prevent presentation attacks (photos, videos, masks).
- **Output**: Liveness Score (0.0 to 1.0) and Label (`LIVE`, `SPOOF`, `UNCERTAIN`).

### 4. Face Recognition (ArcFace / FaceNet)
- **Model**: Pretrained ArcFace model via DeepFace or PyTorch.
- **Purpose**: Extract robust 512-D embeddings from aligned faces.
- **Matching**: Calculate Cosine Similarity against stored embeddings in the database.
- **Threshold**: Configurable (e.g., > 0.65 similarity).

## Multi-Stage Verification Logic
1. Receive Frame.
2. Detect Faces -> If None, return.
3. For each face:
   a. Check Quality -> If POOR, return "Adjust position".
   b. Check Liveness -> If SPOOF, log alert and ignore.
   c. Extract Embedding -> Compute Cosine Similarity against DB.
   d. If Match > Threshold -> Return recognized Student ID.
4. Node.js backend applies **Temporal Consistency** (e.g., requires 3 consistent positive recognitions within 5 seconds before marking attendance).
