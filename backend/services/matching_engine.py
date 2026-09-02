import math
import uuid
import datetime
import logging
from typing import List, Dict, Any, Optional, Tuple
from backend.models.schemas import (
    BoundingBox,
    FacialLandmarks,
    LandmarkPoint,
    RawFaceMatch,
    SearchResultMatchSchema
)

logger = logging.getLogger("MatchingEngine")

class MatchingEngineError(Exception):
    """Base exception for biometric vector matching errors."""
    pass

class EmbeddingValidationError(MatchingEngineError):
    """Raised when an embedding vector is malformed, invalid dimension, non-finite, or zero norm."""
    pass

class MatchingEngine:
    """
    Numerically safe, verified biometric similarity matching engine.
    Compares normalized candidate embeddings against CCTV frame face embeddings.
    """

    EXPECTED_DIMENSION: int = 128
    NORM_TOLERANCE: float = 0.08  # Allows floating point variances around 1.0

    @classmethod
    def validate_embedding(cls, embedding: Any, name: str = "Embedding") -> List[float]:
        """
        Strictly validates that an embedding is a 128-dimensional, finite, non-zero numerical vector.
        Raises EmbeddingValidationError on any defect.
        """
        if embedding is None:
            raise EmbeddingValidationError(f"{name} is None or missing.")

        if not isinstance(embedding, (list, tuple)):
            raise EmbeddingValidationError(f"{name} must be a list or tuple of floats (got {type(embedding).__name__}).")

        if len(embedding) != cls.EXPECTED_DIMENSION:
            raise EmbeddingValidationError(
                f"{name} dimension mismatch: expected {cls.EXPECTED_DIMENSION} floats, got {len(embedding)}."
            )

        float_vec = []
        for i, val in enumerate(embedding):
            if not isinstance(val, (int, float)):
                raise EmbeddingValidationError(f"{name} element at index {i} is not a numeric value ({val}).")
            if math.isnan(val) or math.isinf(val):
                raise EmbeddingValidationError(f"{name} contains non-finite float (NaN or Inf) at index {i}.")
            float_vec.append(float(val))

        # Compute Euclidean norm
        norm_sq = sum(x * x for x in float_vec)
        norm = math.sqrt(norm_sq)

        if norm < 1e-6:
            raise EmbeddingValidationError(f"{name} is a zero or near-zero vector (norm={norm}).")

        return float_vec

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Computes numerically safe, clamp-bounded cosine similarity between two 128-d vectors.
        cosine(A, B) = (A · B) / (||A||_2 * ||B||_2)
        """
        a = cls.validate_embedding(vec_a, "Candidate embedding")
        b = cls.validate_embedding(vec_b, "CCTV face embedding")

        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))

        denom = norm_a * norm_b
        if denom < 1e-12:
            return 0.0

        raw_similarity = dot_product / denom

        # Clamp to mathematically valid cosine bounds [-1.0, 1.0]
        clamped_similarity = max(-1.0, min(1.0, raw_similarity))
        return clamped_similarity

    @classmethod
    def classify_confidence(
        cls,
        similarity: float,
        match_threshold: float = 0.60,
        high_confidence_threshold: float = 0.75
    ) -> str:
        """
        Deterministically classifies similarity score into confidence bands:
        - similarity < match_threshold -> 'NO_MATCH'
        - match_threshold <= similarity < high_confidence_threshold -> 'Medium'
        - similarity >= high_confidence_threshold -> 'High'
        """
        if similarity < match_threshold:
            return "NO_MATCH"
        elif similarity >= high_confidence_threshold:
            return "High"
        else:
            return "Medium"

    @classmethod
    def match_frame_faces(
        cls,
        candidate_embedding: List[float],
        detected_faces: List[Dict[str, Any]],
        search_id: str,
        candidate_id: str,
        video_id: str,
        frame_index: int,
        timestamp_seconds: float,
        match_threshold: float = 0.60,
        high_confidence_threshold: float = 0.75,
        case_id: Optional[str] = None,
        camera_name: Optional[str] = None
    ) -> List[RawFaceMatch]:
        """
        Compares candidate embedding against EVERY valid detected face in a CCTV frame.
        Produces a RawFaceMatch record for every face meeting similarity >= match_threshold.
        """
        matches: List[RawFaceMatch] = []
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cam_name = camera_name or video_id

        # Validate candidate embedding once
        cand_vec = cls.validate_embedding(candidate_embedding, "Candidate embedding")

        for face_idx, face_item in enumerate(detected_faces):
            if isinstance(face_item, dict):
                cctv_emb = face_item.get("embedding")
                raw_bbox = face_item.get("bounding_box", {})
                raw_landmarks = face_item.get("landmarks")
                face_ref_id = face_item.get("face_id")
                det_conf = face_item.get("confidence") or face_item.get("detection_confidence")
            else:
                cctv_emb = getattr(face_item, "embedding", None)
                raw_bbox = getattr(face_item, "bounding_box", {})
                raw_landmarks = getattr(face_item, "landmarks", None)
                face_ref_id = getattr(face_item, "face_id", None)
                det_conf = getattr(face_item, "detection_confidence", None)

            if not cctv_emb:
                continue

            try:
                sim = cls.cosine_similarity(cand_vec, cctv_emb)
            except EmbeddingValidationError as e:
                logger.warning(f"Skipping face {face_idx} in frame {frame_index} of {video_id}: {e}")
                continue

            if sim >= match_threshold:
                conf_band = cls.classify_confidence(
                    sim,
                    match_threshold=match_threshold,
                    high_confidence_threshold=high_confidence_threshold
                )

                # Extract bounding box
                if isinstance(raw_bbox, BoundingBox):
                    bbox = raw_bbox
                elif isinstance(raw_bbox, dict):
                    bbox = BoundingBox(
                        x=int(raw_bbox.get("x", 0)),
                        y=int(raw_bbox.get("y", 0)),
                        width=int(raw_bbox.get("width", 0)),
                        height=int(raw_bbox.get("height", 0))
                    )
                elif hasattr(raw_bbox, "x"):
                    bbox = BoundingBox(
                        x=int(getattr(raw_bbox, "x", 0)),
                        y=int(getattr(raw_bbox, "y", 0)),
                        width=int(getattr(raw_bbox, "width", 0)),
                        height=int(getattr(raw_bbox, "height", 0))
                    )
                else:
                    bbox = BoundingBox(x=0, y=0, width=0, height=0)

                # Extract landmarks if available
                facial_landmarks: Optional[FacialLandmarks] = None
                if raw_landmarks and isinstance(raw_landmarks, FacialLandmarks):
                    facial_landmarks = raw_landmarks
                elif isinstance(raw_landmarks, dict):
                    facial_landmarks = FacialLandmarks(**raw_landmarks)

                match_record = RawFaceMatch(
                    match_id=f"match_{uuid.uuid4().hex[:10]}",
                    search_id=search_id,
                    case_id=case_id,
                    candidate_id=candidate_id,
                    reference_id=face_ref_id,
                    video_id=video_id,
                    camera_name=cam_name,
                    frame_index=frame_index,
                    timestamp_seconds=timestamp_seconds,
                    similarity_score=sim,
                    confidence_band=conf_band,
                    bounding_box=bbox,
                    facial_landmarks=facial_landmarks,
                    face_index=face_idx,
                    detection_confidence=det_conf,
                    created_at=now_iso
                )
                matches.append(match_record)

        return matches

# Singleton instance
matching_engine = MatchingEngine()
