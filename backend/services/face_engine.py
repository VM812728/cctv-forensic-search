import cv2
import numpy as np
import uuid
import datetime
import urllib.request
from typing import List, Tuple, Dict, Any, Optional
from pathlib import Path
from backend.models.schemas import (
    DetectedFace,
    BoundingBox,
    LandmarkPoint,
    FacialLandmarks,
    FaceAnalysisResponse,
    EmbeddingResponse
)
from backend.config import (
    MIN_FACE_SIZE_PX, 
    MIN_CONFIDENCE_THRESHOLD, 
    EMBEDDING_DIMENSION, 
    MODELS_DIR,
    YUNET_MODEL_FILENAME,
    SFACE_MODEL_FILENAME
)

# In-memory storage for Phase 1 candidate embeddings and active YuNet detections
_TEMP_EMBEDDINGS: Dict[str, Dict[str, Any]] = {}
_ACTIVE_YUNET_DETECTIONS: Dict[str, Dict[str, Any]] = {}

YUNET_MODEL_FILE = MODELS_DIR / YUNET_MODEL_FILENAME
SFACE_MODEL_FILE = MODELS_DIR / SFACE_MODEL_FILENAME

# Official OpenCV Zoo URLs for automated model provisioning
YUNET_DOWNLOAD_URL = "https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx?raw=true"
SFACE_DOWNLOAD_URL = "https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx?raw=true"

class FaceEngine:
    def __init__(self):
        self._cascade = None
        self._yunet_detector = None
        self._sface_recognizer = None
        
        # Engine Readiness and Telemetry Attributes
        self.biometric_engine_ready: bool = False
        self.face_detection_model: str = "YuNet ONNX (face_detection_yunet_2023mar.onnx)"
        self.face_recognition_model: str = "SFace ONNX (face_recognition_sface_2021dec.onnx)"
        self.model_files_present: bool = False
        self.missing_model_files: List[str] = []
        self.selected_execution_provider: str = "CPUExecutionProvider"
        self.embedding_dimension: int = EMBEDDING_DIMENSION  # 128-d native SFace embedding
        self.model_initialization_error: Optional[str] = None
        
        self._init_models()

    def _verify_and_download_models(self):
        """Verifies local existence of ONNX weights; downloads if missing."""
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        missing = []

        if not YUNET_MODEL_FILE.exists() or YUNET_MODEL_FILE.stat().st_size < 10000:
            missing.append(YUNET_MODEL_FILENAME)
            try:
                print(f"[FaceEngine] Provisioning {YUNET_MODEL_FILENAME} from OpenCV repository...")
                req = urllib.request.Request(YUNET_DOWNLOAD_URL, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
                    if len(data) > 10000:
                        with open(YUNET_MODEL_FILE, "wb") as f:
                            f.write(data)
                        print(f"[FaceEngine] {YUNET_MODEL_FILENAME} downloaded successfully ({len(data)} bytes).")
            except Exception as e:
                print(f"[FaceEngine] Warning downloading YuNet model: {e}")

        if not SFACE_MODEL_FILE.exists() or SFACE_MODEL_FILE.stat().st_size < 100000:
            missing.append(SFACE_MODEL_FILENAME)
            try:
                print(f"[FaceEngine] Provisioning {SFACE_MODEL_FILENAME} from OpenCV repository...")
                req = urllib.request.Request(SFACE_DOWNLOAD_URL, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = resp.read()
                    if len(data) > 100000:
                        with open(SFACE_MODEL_FILE, "wb") as f:
                            f.write(data)
                        print(f"[FaceEngine] {SFACE_MODEL_FILENAME} downloaded successfully ({len(data)} bytes).")
            except Exception as e:
                print(f"[FaceEngine] Warning downloading SFace model: {e}")

        # Re-check file status after download attempt
        actual_missing = []
        if not YUNET_MODEL_FILE.exists() or YUNET_MODEL_FILE.stat().st_size < 10000:
            actual_missing.append(YUNET_MODEL_FILENAME)
        if not SFACE_MODEL_FILE.exists() or SFACE_MODEL_FILE.stat().st_size < 100000:
            actual_missing.append(SFACE_MODEL_FILENAME)

        self.missing_model_files = actual_missing
        self.model_files_present = (len(actual_missing) == 0)

    def _init_models(self):
        """
        Validates model presence and initializes YuNet and SFace neural network pipelines.
        Sets biometric_engine_ready = True only when both load and pass test inference.
        """
        self._verify_and_download_models()

        yunet_ok = False
        sface_ok = False
        init_errors = []

        # 1. Initialize YuNet ONNX Face Detector
        if YUNET_MODEL_FILE.exists() and YUNET_MODEL_FILE.stat().st_size > 10000:
            try:
                self._yunet_detector = cv2.FaceDetectorYN.create(
                    model=str(YUNET_MODEL_FILE),
                    config="",
                    input_size=(320, 320),
                    score_threshold=MIN_CONFIDENCE_THRESHOLD,
                    nms_threshold=0.3,
                    top_k=5000
                )
                # Warmup inference test
                test_mat = np.zeros((320, 320, 3), dtype=np.uint8)
                self._yunet_detector.setInputSize((320, 320))
                self._yunet_detector.detect(test_mat)
                yunet_ok = True
                print(f"[FaceEngine] YuNet ONNX Face Detector initialized and validated successfully.")
            except Exception as e:
                err_msg = f"YuNet initialization failure: {str(e)}"
                print(f"[FaceEngine] {err_msg}")
                init_errors.append(err_msg)
                self._yunet_detector = None
        else:
            init_errors.append(f"YuNet ONNX model file missing at {YUNET_MODEL_FILE}")

        # 2. Initialize SFace ONNX Face Recognizer
        if SFACE_MODEL_FILE.exists() and SFACE_MODEL_FILE.stat().st_size > 100000:
            try:
                self._sface_recognizer = cv2.FaceRecognizerSF.create(
                    model=str(SFACE_MODEL_FILE),
                    config=""
                )
                # Warmup inference test with 112x112 aligned image
                test_face = np.ones((112, 112, 3), dtype=np.uint8) * 128
                feat = self._sface_recognizer.feature(test_face)
                if feat is not None and feat.shape[1] > 0:
                    self.embedding_dimension = int(feat.shape[1])
                    sface_ok = True
                    print(f"[FaceEngine] SFace ONNX Recognizer initialized and validated (Embedding Dim: {self.embedding_dimension}).")
            except Exception as e:
                err_msg = f"SFace initialization failure: {str(e)}"
                print(f"[FaceEngine] {err_msg}")
                init_errors.append(err_msg)
                self._sface_recognizer = None
        else:
            init_errors.append(f"SFace ONNX model file missing at {SFACE_MODEL_FILE}")

        # Optional Haar Cascade loaded strictly for non-biometric preview fallback
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if Path(cascade_path).exists():
                self._cascade = cv2.CascadeClassifier(cascade_path)
        except Exception:
            self._cascade = None

        # Determine overall readiness
        if yunet_ok and sface_ok:
            self.biometric_engine_ready = True
            self.model_initialization_error = None
            print("[FaceEngine] Biometric engine status: READY (biometric_engine_ready = True)")
        else:
            self.biometric_engine_ready = False
            self.model_initialization_error = "; ".join(init_errors)
            print(f"[FaceEngine] Biometric engine status: DISABLED (biometric_engine_ready = False) - {self.model_initialization_error}")

    def decode_image(self, image_bytes: bytes) -> np.ndarray:
        """Decode raw image bytes into a numpy BGR image."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Unable to decode uploaded image. Supported formats: JPG, PNG, WEBP.")
        return img

    def _extract_facial_landmarks(self, raw_face: np.ndarray) -> FacialLandmarks:
        """Extracts 5-point facial landmarks from 15-element YuNet detection array."""
        return FacialLandmarks(
            right_eye=LandmarkPoint(x=round(float(raw_face[4]), 1), y=round(float(raw_face[5]), 1)),
            left_eye=LandmarkPoint(x=round(float(raw_face[6]), 1), y=round(float(raw_face[7]), 1)),
            nose=LandmarkPoint(x=round(float(raw_face[8]), 1), y=round(float(raw_face[9]), 1)),
            right_mouth_corner=LandmarkPoint(x=round(float(raw_face[10]), 1), y=round(float(raw_face[11]), 1)),
            left_mouth_corner=LandmarkPoint(x=round(float(raw_face[12]), 1), y=round(float(raw_face[13]), 1)),
        )

    def detect_faces(self, img_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Executes real local face detection on the input image using YuNet ONNX Deep Detector.
        Preserves complete 15-element detection array (bbox, 5-point landmarks, confidence).
        """
        h, w = img_bgr.shape[:2]
        raw_faces = []

        # 1. Primary Biometric Deep Detector: YuNet ONNX
        if self._yunet_detector is not None:
            try:
                self._yunet_detector.setInputSize((w, h))
                _, faces = self._yunet_detector.detect(img_bgr)
                if faces is not None:
                    for f in faces:
                        fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                        conf = float(f[14])
                        if conf >= MIN_CONFIDENCE_THRESHOLD:
                            nx = max(0, fx)
                            ny = max(0, fy)
                            nw = min(fw, w - nx)
                            nh = min(fh, h - ny)
                            raw_faces.append({
                                "box": (nx, ny, nw, nh),
                                "confidence": round(conf, 2),
                                "raw_face": f,
                                "method": "YUNET_ONNX"
                            })
                    if len(raw_faces) > 0:
                        return raw_faces
            except Exception as e:
                print(f"[FaceEngine] YuNet inference notice: {e}")

        # 2. Non-Biometric Preview Fallback (Haar Cascade)
        if self._cascade is not None and not self._cascade.empty():
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            faces = self._cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(MIN_FACE_SIZE_PX, MIN_FACE_SIZE_PX),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            for (x, y, fw, fh) in faces:
                nx = max(0, int(x))
                ny = max(0, int(y))
                nw = min(int(fw), w - nx)
                nh = min(int(fh), h - ny)
                conf = min(0.95, max(0.60, 0.70 + (nw / max(w, 1)) * 0.20))
                raw_faces.append({
                    "box": (nx, ny, nw, nh),
                    "confidence": round(float(conf), 2),
                    "method": "HAAR_PREVIEW_ONLY"
                })

        return raw_faces

    def compute_quality_metrics(self, img_bgr: np.ndarray, box: Tuple[int, int, int, int], confidence: float) -> Dict[str, Any]:
        """
        Computes real forensic quality metrics on the localized face crop:
        - Laplacian variance (blur / sharpness)
        - Mean luminance (brightness)
        - Contrast & face resolution
        """
        img_h, img_w = img_bgr.shape[:2]
        x, y, w, h = box

        face_crop = img_bgr[y:y+h, x:x+w]
        if face_crop.size == 0:
            return {
                "quality_score": 0.0,
                "quality_label": "POOR",
                "blur_score": 0.0,
                "brightness_score": 0.0,
                "warnings": ["Invalid face crop area."]
            }

        # 1. Real Blur Analysis via Laplacian Variance
        gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
        sharpness_score = min(100.0, max(0.0, laplacian_var / 5.0))

        # 2. Real Brightness Analysis (Mean Luminance in HSV)
        hsv_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2HSV)
        v_channel = hsv_face[:, :, 2]
        mean_brightness = float(np.mean(v_channel)) / 2.55  # Normalize to 0-100

        # 3. Resolution & Area Coverage
        face_area = w * h
        total_area = max(1, img_w * img_h)
        face_pct = (face_area / total_area) * 100.0

        # 4. Warnings and Penalties
        warnings = []
        if w < MIN_FACE_SIZE_PX or h < MIN_FACE_SIZE_PX:
            warnings.append(f"Face resolution ({w}x{h}px) is below minimum recommended threshold ({MIN_FACE_SIZE_PX}px).")
        
        if sharpness_score < 40.0:
            warnings.append("High blur detected. Facial landmarks may lack sharp edge definitions.")
        elif sharpness_score < 60.0:
            warnings.append("Slight motion or optical blur detected.")

        if mean_brightness < 35.0:
            warnings.append("Low illumination detected in face region (underexposed).")
        elif mean_brightness > 88.0:
            warnings.append("Overexposed illumination detected. High-light clipping on skin tones.")

        # 5. Composite Forensic Quality Score (0.0 to 1.0)
        res_factor = min(1.0, max(0.2, (w * h) / (120 * 120)))
        sharp_factor = min(1.0, max(0.1, sharpness_score / 75.0))
        bright_factor = 1.0 - abs(mean_brightness - 60.0) / 60.0
        bright_factor = max(0.1, min(1.0, bright_factor))
        conf_factor = confidence

        composite_score = (
            res_factor * 0.30 +
            sharp_factor * 0.40 +
            bright_factor * 0.20 +
            conf_factor * 0.10
        )
        composite_score = max(0.10, min(0.99, composite_score))

        if composite_score >= 0.75 and len(warnings) == 0:
            quality_label = "GOOD"
        elif composite_score >= 0.50:
            quality_label = "FAIR"
        else:
            quality_label = "POOR"

        return {
            "quality_score": round(float(composite_score), 2),
            "quality_label": quality_label,
            "blur_score": round(float(sharpness_score), 1),
            "brightness_score": round(float(mean_brightness), 1),
            "face_width_px": int(w),
            "face_height_px": int(h),
            "face_percentage": round(float(face_pct), 1),
            "warnings": warnings
        }

    def detect_and_extract_face_features(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Unified, reusable biometric pipeline for BOTH Candidate reference photos AND CCTV video frames.
        Pipeline:
        Frame (Original BGR) 
          -> YuNet Detection 
          -> 5-Point Landmarks + Bbox (15-element vector) 
          -> SFace alignCrop(frame, raw_face) 
          -> Aligned Face (112x112) 
          -> SFace feature(aligned_face) 
          -> 128-d L2 Unit-Normalized Vector
        
        Returns:
            List of dictionaries containing:
            - face_id: unique face identifier
            - bounding_box: dict(x, y, width, height)
            - landmarks: FacialLandmarks object
            - raw_landmarks_dict: dict with 5 landmark coordinates
            - detection_confidence: float (0.0 to 1.0)
            - embedding: list of 128 float values (L2-normalized)
            - embedding_dimension: int (128)
            - quality_metrics: dict of forensic quality metrics
            - raw_face: np.ndarray (15-d detection array)
            - aligned_face: np.ndarray (112x112 aligned image)
        """
        if not self.biometric_engine_ready or self._sface_recognizer is None or self._yunet_detector is None:
            raise RuntimeError("MODEL_NOT_INITIALIZED: SFace/YuNet ONNX neural network models are not initialized or unavailable.")

        h, w = frame.shape[:2]
        self._yunet_detector.setInputSize((w, h))
        _, faces = self._yunet_detector.detect(frame)

        if faces is None or len(faces) == 0:
            return []

        results = []
        for f in faces:
            conf = float(f[14])
            if conf < MIN_CONFIDENCE_THRESHOLD:
                continue

            fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
            nx = max(0, fx)
            ny = max(0, fy)
            nw = min(fw, w - nx)
            nh = min(fh, h - ny)
            box = (nx, ny, nw, nh)

            # Extract 5 landmarks
            landmarks_obj = self._extract_facial_landmarks(f)
            metrics = self.compute_quality_metrics(frame, box, conf)

            # Align using SFace alignCrop on ORIGINAL frame and 15-element YuNet vector
            try:
                aligned_face = self._sface_recognizer.alignCrop(frame, f)
            except Exception as e:
                print(f"[FaceEngine] SFace alignCrop notice: {e}")
                continue

            if aligned_face is None or aligned_face.size == 0 or aligned_face.shape[:2] != (112, 112):
                continue

            # Extract deep neural feature vector
            try:
                feature = self._sface_recognizer.feature(aligned_face)
            except Exception as e:
                print(f"[FaceEngine] SFace feature notice: {e}")
                continue

            if feature is None or feature.size == 0:
                continue

            flat_features = feature.flatten().astype(np.float32)
            dim = len(flat_features)
            norm = np.linalg.norm(flat_features)
            if norm > 1e-6:
                normed_emb = (flat_features / norm).tolist()
            else:
                normed_emb = flat_features.tolist()

            face_id = f"face_{uuid.uuid4().hex[:8]}"

            # Cache in _ACTIVE_YUNET_DETECTIONS
            _ACTIVE_YUNET_DETECTIONS[face_id] = {
                "raw_face": f.copy(),
                "box": box,
                "confidence": conf,
                "landmarks": landmarks_obj,
                "quality_metrics": metrics,
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }

            results.append({
                "face_id": face_id,
                "bounding_box": {
                    "x": box[0],
                    "y": box[1],
                    "width": box[2],
                    "height": box[3]
                },
                "landmarks": landmarks_obj,
                "raw_landmarks_dict": {
                    "right_eye": (float(f[4]), float(f[5])),
                    "left_eye": (float(f[6]), float(f[7])),
                    "nose": (float(f[8]), float(f[9])),
                    "right_mouth_corner": (float(f[10]), float(f[11])),
                    "left_mouth_corner": (float(f[12]), float(f[13]))
                },
                "detection_confidence": round(conf, 2),
                "embedding": normed_emb,
                "embedding_dimension": dim,
                "quality_metrics": metrics,
                "raw_face": f,
                "aligned_face": aligned_face
            })

        return results

    def analyze_image(self, image_bytes: bytes) -> FaceAnalysisResponse:
        """
        Performs full end-to-end face detection, 5-point landmark extraction,
        biometric quality estimation, and forensic guidance generation.
        """
        img_bgr = self.decode_image(image_bytes)
        img_h, img_w = img_bgr.shape[:2]
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        detected_raw = self.detect_faces(img_bgr)

        if len(detected_raw) == 0:
            return FaceAnalysisResponse(
                face_count=0,
                faces=[],
                image_width=img_w,
                image_height=img_h,
                overall_quality="NONE",
                guidance_message="No face detected in the uploaded image. Please upload a clearer photograph with the candidate facing the camera.",
                analysis_timestamp=now_iso
            )

        detected_faces: List[DetectedFace] = []
        overall_scores = []

        for idx, item in enumerate(detected_raw):
            box = item["box"]
            conf = item["confidence"]
            raw_face = item.get("raw_face")
            metrics = self.compute_quality_metrics(img_bgr, box, conf)

            landmarks_obj = None
            if raw_face is not None and len(raw_face) >= 14:
                landmarks_obj = self._extract_facial_landmarks(raw_face)
            
            face_id = f"face_{uuid.uuid4().hex[:8]}"

            # Cache the exact raw YuNet detection vector for subsequent SFace alignCrop embedding generation
            if raw_face is not None:
                _ACTIVE_YUNET_DETECTIONS[face_id] = {
                    "raw_face": raw_face.copy(),
                    "box": box,
                    "confidence": conf,
                    "landmarks": landmarks_obj,
                    "quality_metrics": metrics,
                    "created_at": now_iso
                }

            detected_faces.append(
                DetectedFace(
                    face_id=face_id,
                    bounding_box=BoundingBox(
                        x=box[0],
                        y=box[1],
                        width=box[2],
                        height=box[3]
                    ),
                    landmarks=landmarks_obj,
                    detection_confidence=conf,
                    quality_score=metrics["quality_score"],
                    quality_label=metrics["quality_label"],
                    blur_score=metrics["blur_score"],
                    brightness_score=metrics["brightness_score"],
                    face_width_px=metrics["face_width_px"],
                    face_height_px=metrics["face_height_px"],
                    face_percentage=metrics["face_percentage"],
                    warnings=metrics["warnings"]
                )
            )
            overall_scores.append(metrics["quality_score"])

        avg_score = sum(overall_scores) / len(overall_scores)
        if len(detected_faces) == 1:
            if avg_score >= 0.75:
                overall_quality = "GOOD"
                guidance = "Candidate face successfully verified with high biometric fidelity and 5-point landmark alignment. Ready for SFace ONNX neural embedding."
            elif avg_score >= 0.50:
                overall_quality = "FAIR"
                guidance = "Face detected with acceptable quality. Some optical blur or lighting variance noted."
            else:
                overall_quality = "POOR"
                guidance = "Please upload a clearer image with the face visible and directly facing the camera."
        else:
            overall_quality = "MULTIPLE"
            guidance = f"{len(detected_faces)} faces detected. Please select the correct candidate face bounding box."

        return FaceAnalysisResponse(
            face_count=len(detected_faces),
            faces=detected_faces,
            image_width=img_w,
            image_height=img_h,
            overall_quality=overall_quality,
            guidance_message=guidance,
            analysis_timestamp=now_iso
        )

    def generate_face_embedding(self, image_bytes: bytes, bbox: Optional[BoundingBox] = None, face_id: Optional[str] = None) -> EmbeddingResponse:
        """
        Extracts real normalized biometric feature embedding vector using SFace ONNX with 5-point landmark alignment (alignCrop).
        Strictly raises explicit error codes on failures:
        - MODEL_NOT_INITIALIZED
        - NO_FACE_DETECTED
        - FACE_LANDMARKS_UNAVAILABLE
        - FACE_ALIGNMENT_FAILED
        - EMBEDDING_GENERATION_FAILED
        - MULTIPLE_FACES_REQUIRE_SELECTION
        """
        if not self.biometric_engine_ready or self._sface_recognizer is None or self._yunet_detector is None:
            raise RuntimeError("MODEL_NOT_INITIALIZED: SFace ONNX neural network model is not initialized or unavailable.")

        img_bgr = self.decode_image(image_bytes)
        img_h, img_w = img_bgr.shape[:2]

        raw_face: Optional[np.ndarray] = None
        target_box: Optional[Tuple[int, int, int, int]] = None
        target_conf: float = 0.95

        # 1. Check if face_id is already in active YuNet detection cache
        if face_id and face_id in _ACTIVE_YUNET_DETECTIONS:
            cached_data = _ACTIVE_YUNET_DETECTIONS[face_id]
            raw_face = cached_data["raw_face"]
            target_box = cached_data["box"]
            target_conf = cached_data["confidence"]
        else:
            # 2. Run YuNet detection on original full image
            detected = self.detect_faces(img_bgr)
            yunet_detected = [d for d in detected if d.get("method") == "YUNET_ONNX" and "raw_face" in d]

            if len(yunet_detected) == 0:
                raise RuntimeError("NO_FACE_DETECTED: No valid face with facial landmarks was detected by YuNet.")

            if bbox is not None:
                # Find matching YuNet face by highest Intersection over Union (IoU)
                best_iou = 0.0
                best_match = None
                bx, by, bw, bh = bbox.x, bbox.y, bbox.width, bbox.height
                
                for candidate in yunet_detected:
                    cx, cy, cw, ch = candidate["box"]
                    # Calculate IoU
                    inter_x1 = max(bx, cx)
                    inter_y1 = max(by, cy)
                    inter_x2 = min(bx + bw, cx + cw)
                    inter_y2 = min(by + bh, cy + ch)
                    
                    inter_w = max(0, inter_x2 - inter_x1)
                    inter_h = max(0, inter_y2 - inter_y1)
                    inter_area = inter_w * inter_h
                    
                    b_area = bw * bh
                    c_area = cw * ch
                    union_area = float(b_area + c_area - inter_area)
                    
                    iou = inter_area / union_area if union_area > 0 else 0.0
                    if iou > best_iou:
                        best_iou = iou
                        best_match = candidate

                if best_match is not None and best_iou >= 0.15:
                    raw_face = best_match["raw_face"]
                    target_box = best_match["box"]
                    target_conf = best_match["confidence"]
                else:
                    raise RuntimeError("FACE_LANDMARKS_UNAVAILABLE: Could not match the provided bounding box with a YuNet facial landmark detection.")
            elif len(yunet_detected) > 1:
                raise RuntimeError("MULTIPLE_FACES_REQUIRE_SELECTION: Multiple faces detected. Please select a specific candidate face to generate embedding.")
            else:
                raw_face = yunet_detected[0]["raw_face"]
                target_box = yunet_detected[0]["box"]
                target_conf = yunet_detected[0]["confidence"]

        if raw_face is None or len(raw_face) < 14:
            raise RuntimeError("FACE_LANDMARKS_UNAVAILABLE: 5-point YuNet facial landmarks are unavailable for this face.")

        if target_box is None:
            target_box = (int(raw_face[0]), int(raw_face[1]), int(raw_face[2]), int(raw_face[3]))

        metrics = self.compute_quality_metrics(img_bgr, target_box, target_conf)

        # 3. Mandatory 5-point facial landmark alignment via SFace alignCrop on ORIGINAL image
        try:
            aligned_face = self._sface_recognizer.alignCrop(img_bgr, raw_face)
        except Exception as e:
            raise RuntimeError(f"FACE_ALIGNMENT_FAILED: OpenCV SFace alignCrop failed: {str(e)}")

        if aligned_face is None or aligned_face.size == 0 or aligned_face.shape[:2] != (112, 112):
            raise RuntimeError("FACE_ALIGNMENT_FAILED: SFace alignCrop produced invalid or empty matrix.")

        # 4. Mandatory SFace feature extraction on aligned 112x112 image
        try:
            feature = self._sface_recognizer.feature(aligned_face)
        except Exception as e:
            raise RuntimeError(f"EMBEDDING_GENERATION_FAILED: SFace feature extraction failed: {str(e)}")

        if feature is None or feature.size == 0:
            raise RuntimeError("EMBEDDING_GENERATION_FAILED: SFace returned empty feature vector.")

        # 5. Conversion to float32, flattening, and L2 unit normalization
        flat_features = feature.flatten().astype(np.float32)
        actual_dim = len(flat_features)

        norm = np.linalg.norm(flat_features)
        if norm > 1e-6:
            embedding_vector = (flat_features / norm).tolist()
        else:
            embedding_vector = flat_features.tolist()

        active_id = face_id or f"emb_{uuid.uuid4().hex[:10]}"
        _TEMP_EMBEDDINGS[active_id] = {
            "embedding": embedding_vector,
            "dimension": actual_dim,
            "quality_score": metrics["quality_score"],
            "model": "SFace_ONNX_SphereFace2_Aligned",
            "aligned": True,
            "landmarks_used": 5,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        return EmbeddingResponse(
            embedding_created=True,
            embedding_dimension=actual_dim,
            face_quality_score=metrics["quality_score"],
            message=f"SFace ONNX {actual_dim}-dimensional landmark-aligned neural embedding generated (Quality: {metrics['quality_label']}).",
            face_id=active_id
        )

# Global Face Engine Singleton
face_engine = FaceEngine()

