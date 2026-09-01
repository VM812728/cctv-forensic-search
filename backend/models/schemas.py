from typing import List, Optional, Dict, Any

try:
    from pydantic import BaseModel, Field
except ImportError:
    # Graceful fallback for environments where pydantic is not installed
    class _FieldInfo:
        def __init__(self, default=..., default_factory=None, **kwargs):
            self.default = default
            self.default_factory = default_factory
            self.kwargs = kwargs

    def Field(default=..., default_factory=None, **kwargs):
        return _FieldInfo(default=default, default_factory=default_factory, **kwargs)

    class BaseModel:
        def __init__(self, **data):
            for k, v in data.items():
                setattr(self, k, v)
            for attr, val in self.__class__.__dict__.items():
                if attr.startswith("_"):
                    continue
                if attr not in data:
                    if isinstance(val, _FieldInfo):
                        if val.default_factory is not None:
                            setattr(self, attr, val.default_factory())
                        elif val.default is not ...:
                            setattr(self, attr, val.default)
                    elif not callable(val):
                        setattr(self, attr, val)

        def dict(self) -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if k.startswith("_"):
                    continue
                if hasattr(v, "dict") and callable(v.dict):
                    res[k] = v.dict()
                elif isinstance(v, list):
                    res[k] = [x.dict() if hasattr(x, "dict") and callable(x.dict) else x for x in v]
                else:
                    res[k] = v
            return res

        def copy(self, update: Optional[Dict[str, Any]] = None):
            d = self.dict()
            if update:
                d.update(update)
            return self.__class__(**d)

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", example="healthy")
    service: str = Field(default="CCTV Candidate Search Backend", example="CCTV Candidate Search Backend")
    version: str = Field(default="1.0.0", example="1.0.0")

class SystemInfoResponse(BaseModel):
    os: str
    os_release: str
    python_version: str
    cpu: str
    cpu_cores: int
    ram_total_gb: float
    ram_available_gb: float
    gpu_available: bool
    gpu_name: Optional[str] = None
    cuda_available: bool
    onnx_providers: List[str]
    biometric_engine_ready: bool
    face_detection_model: str
    face_recognition_model: str
    model_files_present: bool
    missing_model_files: List[str] = Field(default_factory=list)
    selected_execution_provider: str
    embedding_dimension: int
    model_initialization_error: Optional[str] = None

class BoundingBox(BaseModel):
    x: int = Field(..., description="Top-left X coordinate in pixels")
    y: int = Field(..., description="Top-left Y coordinate in pixels")
    width: int = Field(..., description="Face bounding box width in pixels")
    height: int = Field(..., description="Face bounding box height in pixels")

class LandmarkPoint(BaseModel):
    x: float = Field(..., description="X coordinate of facial landmark")
    y: float = Field(..., description="Y coordinate of facial landmark")

class FacialLandmarks(BaseModel):
    right_eye: LandmarkPoint
    left_eye: LandmarkPoint
    nose: LandmarkPoint
    right_mouth_corner: LandmarkPoint
    left_mouth_corner: LandmarkPoint

class DetectedFace(BaseModel):
    face_id: str
    bounding_box: BoundingBox
    landmarks: Optional[FacialLandmarks] = None
    detection_confidence: float = Field(..., ge=0.0, le=1.0)
    quality_score: float = Field(..., ge=0.0, le=1.0)
    quality_label: str = Field(..., description="GOOD | FAIR | POOR")
    blur_score: float = Field(..., description="Sharpness / gradient variance score")
    brightness_score: float = Field(..., description="Average luminance 0-100")
    face_width_px: int
    face_height_px: int
    face_percentage: float
    warnings: List[str] = Field(default_factory=list)

class FaceAnalysisResponse(BaseModel):
    face_count: int
    faces: List[DetectedFace]
    image_width: int
    image_height: int
    overall_quality: str
    guidance_message: str
    analysis_timestamp: str

class EmbeddingResponse(BaseModel):
    embedding_created: bool
    embedding_dimension: int
    face_quality_score: float
    message: str
    face_id: str

class CandidateReference(BaseModel):
    candidate_id: str
    reference_id: str
    face_id: str
    roll_number: Optional[str] = None
    candidate_name: Optional[str] = None
    embedding_available: bool = True
    embedding_dimension: int = 128
    quality_score: float
    quality_label: str
    created_at: str

class SearchConfig(BaseModel):
    sampling_fps: float = Field(default=3.0, description="Frames per second to sample during CCTV scanning")
    match_threshold: float = Field(default=0.60, description="Cosine similarity threshold for candidate match")
    high_confidence_threshold: float = Field(default=0.75, description="High confidence boundary threshold")
    match_gap_tolerance_seconds: float = Field(default=3.0, description="Maximum gap in seconds between detections to group into same appearance")
    min_event_duration_seconds: float = Field(default=1.0, description="Minimum duration of a valid appearance event")
    pre_roll_seconds: float = Field(default=5.0, description="Pre-roll context buffer in seconds for clip extraction")
    post_roll_seconds: float = Field(default=5.0, description="Post-roll context buffer in seconds for clip extraction")
    verification_enabled: bool = Field(default=True, description="Enable two-pass dense boundary verification")

class StartSearchRequest(BaseModel):
    case_id: Optional[str] = None
    candidate_id: str = Field(..., description="Candidate ID or Face ID with verified embedding")
    face_id: Optional[str] = Field(None, description="Active YuNet Face ID")
    selected_video_ids: List[str] = Field(..., min_items=1, description="List of CCTV video identifiers or file paths to search")
    config: Optional[SearchConfig] = Field(default_factory=SearchConfig)

class StartSearchResponse(BaseModel):
    search_id: str
    status: str = Field(default="QUEUED", description="QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED")
    message: str
    candidate_id: str
    videos_total: int
    created_at: str

class RawFaceMatch(BaseModel):
    match_id: str
    search_id: str
    case_id: Optional[str] = None
    candidate_id: str
    reference_id: Optional[str] = None
    video_id: str
    camera_name: Optional[str] = None
    frame_index: int
    timestamp_seconds: float
    similarity_score: float
    confidence_band: str = Field(description="High | Medium | Low")
    bounding_box: BoundingBox
    facial_landmarks: Optional[FacialLandmarks] = None
    face_index: Optional[int] = 0
    detection_confidence: Optional[float] = None
    created_at: Optional[str] = None

class AppearanceEvent(BaseModel):
    event_id: str
    search_id: str
    case_id: Optional[str] = None
    candidate_id: str
    reference_id: Optional[str] = None
    video_id: str
    camera_name: Optional[str] = None
    start_time_seconds: float
    end_time_seconds: float
    duration_seconds: float
    peak_similarity: float
    peak_timestamp_seconds: float
    peak_frame_index: Optional[int] = None
    peak_bounding_box: BoundingBox
    peak_facial_landmarks: Optional[FacialLandmarks] = None
    frame_match_count: int = 1
    confidence_band: str = Field(default="Medium", description="High | Medium | Low")
    thumbnail_url: Optional[str] = None
    clip_id: Optional[str] = None
    clip_generated: bool = False
    created_at: Optional[str] = None

    def to_search_result_match(self) -> "SearchResultMatchSchema":
        return SearchResultMatchSchema(
            id=self.event_id,
            search_id=self.search_id,
            case_id=self.case_id,
            candidate_id=self.candidate_id,
            video_id=self.video_id,
            camera_name=self.camera_name or self.video_id,
            event_start_seconds=self.start_time_seconds,
            event_end_seconds=self.end_time_seconds,
            peak_timestamp_seconds=self.peak_timestamp_seconds,
            similarity_score=self.peak_similarity,
            confidence_band=self.confidence_band,
            thumbnail_url=self.thumbnail_url,
            cctv_frame_url=None,
            bounding_box=self.peak_bounding_box,
            duration_seconds=self.duration_seconds,
            clip_generated=self.clip_generated,
            clip_id=self.clip_id,
            frame_index=self.peak_frame_index,
            raw_match_id=self.event_id,
            frame_match_count=self.frame_match_count,
            facial_landmarks=self.peak_facial_landmarks,
            reference_id=self.reference_id
        )

class SearchResultMatchSchema(BaseModel):
    id: str
    search_id: str
    case_id: Optional[str] = None
    candidate_id: str
    reference_id: Optional[str] = None
    video_id: str
    camera_name: str
    event_start_seconds: float
    event_end_seconds: float
    peak_timestamp_seconds: float
    similarity_score: float
    confidence_band: str = Field(description="High | Medium | Low")
    thumbnail_url: Optional[str] = None
    cctv_frame_url: Optional[str] = None
    bounding_box: BoundingBox
    facial_landmarks: Optional[FacialLandmarks] = None
    duration_seconds: float
    clip_generated: bool = False
    clip_id: Optional[str] = None
    frame_index: Optional[int] = None
    raw_match_id: Optional[str] = None
    frame_match_count: int = 1

class SearchStatusResponse(BaseModel):
    search_id: str
    case_id: Optional[str] = None
    candidate_id: str
    status: str = Field(description="QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED")
    progress_percent: float = Field(ge=0.0, le=100.0)
    videos_total: int
    videos_processed: int
    current_video: Optional[str] = None
    current_timestamp: Optional[str] = None
    frames_processed: int = 0
    faces_detected: int = 0
    potential_matches: int = 0
    verified_matches: int = 0
    processing_fps: float = 0.0
    elapsed_seconds: float = 0.0
    estimated_remaining_seconds: float = 0.0
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    results: List[SearchResultMatchSchema] = Field(default_factory=list)
    raw_matches: List[RawFaceMatch] = Field(default_factory=list)

class ClipEvidence(BaseModel):
    clip_id: str
    event_id: str
    search_id: Optional[str] = None
    case_id: Optional[str] = None
    candidate_id: Optional[str] = None
    reference_id: Optional[str] = None
    video_id: str
    camera_name: Optional[str] = None
    source_video_filename: str
    output_filename: str
    clip_path: Optional[str] = None
    clip_start_seconds: float
    clip_end_seconds: float
    duration_seconds: float
    peak_timestamp_seconds: float
    peak_similarity: float
    sha256: str
    file_size_bytes: int
    mime_type: str = "video/mp4"
    extraction_method: str = Field(description="stream_copy | re_encoded")
    created_at: str

class ExtractClipRequest(BaseModel):
    event_id: str = Field(..., description="Target Stage F AppearanceEvent ID or match ID")
    search_id: Optional[str] = Field(None, description="Optional Search Job ID to update match state")
    case_id: Optional[str] = None
    video_id: Optional[str] = None
    source_video_path: Optional[str] = None
    camera_name: Optional[str] = None
    candidate_id: Optional[str] = None
    reference_id: Optional[str] = None
    start_time_seconds: Optional[float] = None
    end_time_seconds: Optional[float] = None
    peak_timestamp_seconds: Optional[float] = None
    peak_similarity: Optional[float] = None
    pre_roll_seconds: float = Field(default=5.0, description="Pre-roll context buffer in seconds")
    post_roll_seconds: float = Field(default=5.0, description="Post-roll context buffer in seconds")
    force_reencode: bool = Field(default=False, description="Bypass stream copy and force libx264 re-encoding")

class ClipEvidenceResponse(BaseModel):
    clip: ClipEvidence
    message: str = "Evidence clip extracted successfully"
    status: str = "SUCCESS"



