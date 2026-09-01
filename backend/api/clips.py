import os
import logging
from pathlib import Path
from typing import Optional, List

try:
    from fastapi import APIRouter, HTTPException, Path as FPath, Query, Response
    from fastapi.responses import FileResponse
except ImportError:
    class APIRouter:
        def __init__(self, *args, **kwargs): pass
        def post(self, *args, **kwargs): return lambda f: f
        def get(self, *args, **kwargs): return lambda f: f
    class HTTPException(Exception):
        def __init__(self, status_code, detail):
            self.status_code = status_code
            self.detail = detail
            super().__init__(f"{status_code}: {detail}")
    def FPath(*args, **kwargs): return None
    def Query(*args, **kwargs): return None
    class Response:
        pass
    class FileResponse:
        def __init__(self, path, media_type=None, filename=None):
            self.path = path
            self.media_type = media_type
            self.filename = filename

from backend.models.schemas import (

    ClipEvidence,
    ClipEvidenceResponse,
    ExtractClipRequest
)
from backend.services.clip_extractor import ClipExtractor, ClipRepository
from backend.services.storage_manager import (
    resolve_clip_path,
    resolve_video_path,
    sanitize_filename,
    get_clips_directory,
    STORAGE_DIR
)
from backend.services.search_service import SearchJobManager

logger = logging.getLogger("ClipsAPI")

router = APIRouter(prefix="/clips", tags=["Forensic Evidence Clips"])


@router.post("/extract", response_model=ClipEvidenceResponse)
async def extract_clip_endpoint(request: ExtractClipRequest):
    """
    Extracts an automated, forensically verified evidence video clip for a Stage F AppearanceEvent.
    Calculates pre-roll / post-roll bounded time window, executes FFmpeg stream-copy or re-encoding,
    computes SHA-256 byte hash, and updates search match status.
    """
    event_id = request.event_id
    search_id = request.search_id
    video_id = request.video_id
    case_id = request.case_id

    # 1. Resolve AppearanceEvent metadata if search_id provided
    start_time = request.start_time_seconds
    end_time = request.end_time_seconds
    peak_timestamp = request.peak_timestamp_seconds
    peak_similarity = request.peak_similarity
    candidate_id = request.candidate_id
    reference_id = request.reference_id
    camera_name = request.camera_name

    if search_id:
        job = SearchJobManager.get_job_status(search_id)
        if job:
            case_id = case_id or job.case_id
            candidate_id = candidate_id or job.candidate_id
            # Find the match in job.results
            for r in job.results:
                r_id = r.get("id") if isinstance(r, dict) else getattr(r, "id", None)
                r_raw_id = r.get("raw_match_id") if isinstance(r, dict) else getattr(r, "raw_match_id", None)
                if r_id == event_id or r_raw_id == event_id:
                    video_id = video_id or (r.get("video_id") if isinstance(r, dict) else getattr(r, "video_id", None))
                    camera_name = camera_name or (r.get("camera_name") if isinstance(r, dict) else getattr(r, "camera_name", None))
                    start_time = start_time if start_time is not None else (r.get("event_start_seconds") if isinstance(r, dict) else getattr(r, "event_start_seconds", None))
                    end_time = end_time if end_time is not None else (r.get("event_end_seconds") if isinstance(r, dict) else getattr(r, "event_end_seconds", None))
                    peak_timestamp = peak_timestamp if peak_timestamp is not None else (r.get("peak_timestamp_seconds") if isinstance(r, dict) else getattr(r, "peak_timestamp_seconds", None))
                    peak_similarity = peak_similarity if peak_similarity is not None else (r.get("similarity_score") if isinstance(r, dict) else getattr(r, "similarity_score", None))
                    reference_id = reference_id or (r.get("reference_id") if isinstance(r, dict) else getattr(r, "reference_id", None))
                    break


    # Fallback to default values if not found or standalone
    if start_time is None:
        start_time = 0.0
    if end_time is None:
        end_time = start_time
    if peak_timestamp is None:
        peak_timestamp = start_time
    if peak_similarity is None:
        peak_similarity = 0.0

    if not video_id and not request.source_video_path:
        raise HTTPException(
            status_code=400,
            detail="MISSING_VIDEO_ID: A valid CCTV video_id or source_video_path must be provided."
        )

    source_target = request.source_video_path or video_id

    # 2. Invoke ClipExtractor
    try:
        evidence = ClipExtractor.extract_clip(
            source_video=source_target,
            event_id=event_id,
            start_time_seconds=start_time,
            end_time_seconds=end_time,
            peak_timestamp_seconds=peak_timestamp,
            peak_similarity=peak_similarity,
            search_id=search_id,
            case_id=case_id,
            candidate_id=candidate_id,
            reference_id=reference_id,
            camera_name=camera_name,
            video_id=video_id or Path(str(source_target)).name,
            pre_roll_seconds=request.pre_roll_seconds,
            post_roll_seconds=request.post_roll_seconds,
            force_reencode=request.force_reencode
        )

        # 3. Update Search Job match state if search_id was provided
        if search_id:
            SearchJobManager.update_match_clip(search_id, event_id, evidence.clip_id)

        return ClipEvidenceResponse(
            clip=evidence,
            message="Evidence clip extracted successfully",
            status="SUCCESS"
        )

    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except RuntimeError as run_err:
        raise HTTPException(status_code=500, detail=str(run_err))
    except Exception as exc:
        logger.error(f"Unexpected error during clip extraction: {str(exc)}")
        raise HTTPException(status_code=500, detail=f"CLIP_EXTRACTION_FAILED: {str(exc)}")


@router.get("/{clip_id}", response_model=ClipEvidence)
async def get_clip_metadata(clip_id: str = FPath(..., description="Unique Evidence Clip ID")):
    """
    Retrieves forensic metadata, time bounds, SHA-256 hash, and extraction method for a generated clip.
    """
    clean_id = sanitize_filename(clip_id).replace(".mp4", "")
    clip = ClipRepository.get_clip(clean_id)
    if not clip:
        # Check if file exists on disk
        resolved = resolve_clip_path(clean_id)
        if not resolved or not resolved.is_file():
            raise HTTPException(
                status_code=404,
                detail=f"CLIP_NOT_FOUND: Evidence clip '{clean_id}' not found in registry or storage."
            )
        # Construct minimal metadata if file exists
        file_size = resolved.stat().st_size
        sha256_hash = ClipExtractor.compute_sha256(resolved)
        clip = ClipEvidence(
            clip_id=clean_id,
            event_id=clean_id,
            video_id=resolved.name,
            source_video_filename=resolved.name,
            output_filename=resolved.name,
            clip_path=str(resolved),
            clip_start_seconds=0.0,
            clip_end_seconds=0.0,
            duration_seconds=0.0,
            peak_timestamp_seconds=0.0,
            peak_similarity=0.0,
            sha256=sha256_hash,
            file_size_bytes=file_size,
            mime_type="video/mp4",
            extraction_method="stream_copy",
            created_at=resolved.stat().st_ctime
        )
    return clip


@router.get("/{clip_id}/stream")
async def stream_clip(clip_id: str = FPath(..., description="Unique Evidence Clip ID")):
    """
    Streams the generated evidence video clip with HTTP range request support.
    Strictly isolated to approved storage boundaries to prevent arbitrary file access.
    """
    clean_id = sanitize_filename(clip_id).replace(".mp4", "")
    clip_file = resolve_clip_path(clean_id)

    if not clip_file or not clip_file.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"CLIP_NOT_FOUND: Evidence clip file '{clean_id}.mp4' does not exist."
        )

    # Security check: must reside within STORAGE_DIR
    resolved_storage = STORAGE_DIR.resolve()
    if not str(clip_file.resolve()).startswith(str(resolved_storage)):
        raise HTTPException(status_code=403, detail="SECURITY_ERROR: Access denied outside storage directory.")

    return FileResponse(
        path=str(clip_file),
        media_type="video/mp4",
        filename=f"{clean_id}.mp4"
    )


@router.get("", response_model=List[ClipEvidence])
async def list_clips(case_id: Optional[str] = Query(None, description="Filter clips by Case ID")):
    """
    Lists all forensic clip evidence records registered in the current session.
    """
    return ClipRepository.list_clips(case_id=case_id)
