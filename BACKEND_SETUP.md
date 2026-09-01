# CCTV Candidate Search & Evidence Station - Backend Setup (Phase 1)

## Overview
The FastAPI backend provides a real, local biometric facial detection and embedding pipeline for candidate identification. It does not use any cloud APIs (AWS, Google Vision, Azure) and operates completely locally on the workstation.

---

## 1. Prerequisites
- **Python**: Python 3.10, 3.11, or 3.12 (64-bit recommended)
- **Node.js**: v18+ (for the React forensic workstation frontend)
- **Git**

---

## 2. Quick Start (Windows)

Simply double-click:
```cmd
start_backend.bat
```
This script checks Python, installs dependencies from `backend/requirements.txt`, and boots the server at `http://localhost:8000`.

---

## 3. Manual Installation & Execution

### Step 1: Create and activate a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### Step 2: Install Required Dependencies
```bash
pip install -r backend/requirements.txt
```

### Step 3: Run the FastAPI Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will be available at:
- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

---

## 4. API Endpoints (Phase 1)

### `GET /health`
Verifies backend operational status.
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "CCTV Candidate Search Backend",
    "version": "1.0.0"
  }
  ```

### `GET /system/info`
Retrieves local workstation OS, CPU, RAM, CUDA/GPU availability, and ONNX Runtime execution providers.

### `POST /candidate/analyze`
Accepts a candidate photo (`multipart/form-data` or `image_base64`), runs real local face detection, calculates bounding boxes, pixel blur/sharpness, illumination, face size, and returns forensic quality metrics.
- **Sample Response**:
  ```json
  {
    "face_count": 1,
    "faces": [
      {
        "face_id": "face_a91c4b22",
        "bounding_box": { "x": 120, "y": 80, "width": 210, "height": 220 },
        "detection_confidence": 0.98,
        "quality_score": 0.88,
        "quality_label": "GOOD",
        "blur_score": 82.4,
        "brightness_score": 68.1,
        "face_width_px": 210,
        "face_height_px": 220,
        "face_percentage": 24.5,
        "warnings": []
      }
    ],
    "image_width": 800,
    "image_height": 950,
    "overall_quality": "GOOD",
    "guidance_message": "Candidate face successfully verified with high biometric fidelity.",
    "analysis_timestamp": "2026-08-31T09:15:00Z"
  }
  ```

### `POST /candidate/embedding`
Accepts the candidate image and optional selected face bounding box. Extracts a normalized 512-dimensional feature embedding vector and stores it in temporary cache for forensic matching.

---

## 5. Verification & Testing

1. **Verify Backend Health**:
   ```bash
   curl http://localhost:8000/health
   ```
2. **Verify Swagger UI**:
   Open `http://localhost:8000/docs` in your browser.
3. **Verify Frontend Connection**:
   In `.env` or `.env.example`, ensure `VITE_API_URL=http://localhost:8000`.
