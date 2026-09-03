import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Path as FPath
from typing import List, Optional
from backend.models.schemas import (
    StartSearchRequest,
    StartSearchResponse,
    SearchStatusResponse,
    SearchResultMatchSchema,
    RawFaceMatch
)
from backend.services.search_service import CandidateRepository, SearchJobManager
from backend.services.face_engine import face_engine, _TEMP_EMBEDDINGS
from backend.services.storage_manager import sanitize_filename

logger = logging.getLogger("SearchAPI")

router = APIRouter(prefix="/search", tags=["CCTV Candidate Search Engine"])

@router.post("/start", response_model=StartSearchResponse)
async def start_search_job(request: StartSearchRequest, background_tasks: BackgroundTasks):
    """
    Validates candidate reference and requested CCTV video resources,
    initializes a SearchJob in QUEUED state, enqueues background processing, and returns search_id.
    """
    # 1. Biometric Engine Readiness Check
    if not face_engine.biometric_engine_ready:
        raise HTTPException(
            status_code=503,
            detail="MODEL_NOT_INITIALIZED: SFace ONNX neural network models are not initialized or available."
        )

    # 2. Validate Candidate Reference / Embedding Availability
    target_candidate_id = request.candidate_id
    if not CandidateRepository.exists(target_candidate_id):
        # Check fallback to face_id in _TEMP_EMBEDDINGS or active request.face_id
        if request.face_id and CandidateRepository.exists(request.face_id):
            target_candidate_id = request.face_id
        elif target_candidate_id in _TEMP_EMBEDDINGS:
            # Register on-the-fly from temporary cache
            emb_data = _TEMP_EMBEDDINGS[target_candidate_id]
            CandidateRepository.save_reference(
                candidate_id=target_candidate_id,
                face_id=target_candidate_id,
                embedding=emb_data["embedding"],
                quality_score=emb_data.get("quality_score", 0.85),
                quality_label="GOOD"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"CANDIDATE_NOT_FOUND: Candidate reference '{target_candidate_id}' has no verified biometric embedding."
            )

    # 3. Validate CCTV Video list
    if not request.selected_video_ids or len(request.selected_video_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="NO_VIDEOS_SELECTED: At least one valid CCTV video identifier must be provided."
        )

    # Sanitize video identifiers/paths
    clean_video_ids = []
    for vid in request.selected_video_ids:
        if not vid or len(vid.strip()) == 0:
            continue
        clean_name = sanitize_filename(vid)
        clean_video_ids.append(clean_name)

    if len(clean_video_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="INVALID_VIDEO_IDENTIFIERS: Provided video identifiers were invalid or contained illegal characters."
        )

    # 4. Create SearchJob in QUEUED state
    search_id = SearchJobManager.create_job(
        candidate_id=target_candidate_id,
        selected_video_ids=clean_video_ids,
        config=request.config,
        case_id=request.case_id
    )

    logger.info(f"Created SearchJob {search_id} for candidate {target_candidate_id} across {len(clean_video_ids)} videos.")

    # 5. Enqueue background scan execution
    background_tasks.add_task(SearchJobManager.execute_search_scan, search_id)

    return StartSearchResponse(
        search_id=search_id,
        status="QUEUED",
        message=f"Search job created and queued for {len(clean_video_ids)} CCTV video(s).",
        candidate_id=target_candidate_id,
        videos_total=len(clean_video_ids),
        created_at=SearchJobManager.get_job_status(search_id).created_at
    )

@router.get("/{search_id}/status", response_model=SearchStatusResponse)
async def get_search_status(search_id: str = FPath(..., description="Unique Search ID")):
    """
    Returns real search job progress and telemetry.
    """
    job = SearchJobManager.get_job_status(search_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"SEARCH_NOT_FOUND: Search job '{search_id}' does not exist."
        )
    return job

@router.get("/{search_id}/results", response_model=List[SearchResultMatchSchema])
async def get_search_results(search_id: str = FPath(..., description="Unique Search ID")):
    """
    Returns all detected appearance match records for a given search.
    """
    job = SearchJobManager.get_job_status(search_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"SEARCH_NOT_FOUND: Search job '{search_id}' does not exist."
        )
    return job.results

@router.get("/{search_id}/raw-matches", response_model=List[RawFaceMatch])
async def get_search_raw_matches(search_id: str = FPath(..., description="Unique Search ID")):
    """
    Returns un-grouped frame-level raw face matches for Stage E verification.
    """
    job = SearchJobManager.get_job_status(search_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"SEARCH_NOT_FOUND: Search job '{search_id}' does not exist."
        )
    return SearchJobManager.get_raw_matches(search_id)

@router.get("/{search_id}/pass2-matches", response_model=List[RawFaceMatch])
@router.get("/{search_id}/matches/pass2", response_model=List[RawFaceMatch])
async def get_search_pass2_matches(search_id: str = FPath(..., description="Unique Search ID")):
    """
    Returns Stage H Pass 2 dense verification raw face matches.
    """
    job = SearchJobManager.get_job_status(search_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"SEARCH_NOT_FOUND: Search job '{search_id}' does not exist."
        )
    return SearchJobManager.get_pass2_matches(search_id)

