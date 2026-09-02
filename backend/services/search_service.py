import uuid
import time
import logging
import datetime
import asyncio
from typing import Dict, Any, Optional, List
from backend.models.schemas import (
    CandidateReference, 
    SearchConfig, 
    SearchStatusResponse, 
    SearchResultMatchSchema,
    RawFaceMatch,
    AppearanceEvent,
    BoundingBox,
    FacialLandmarks
)
from backend.services.storage_manager import resolve_video_path
try:
    from backend.services.video_engine import video_engine
except Exception as _ve_err:
    video_engine = None

try:
    from backend.services.face_engine import face_engine
except Exception as _fe_err:
    face_engine = None

from backend.services.matching_engine import matching_engine
from backend.services.temporal_grouper import temporal_grouper
from backend.services.verification_engine import verification_engine

logger = logging.getLogger("SearchService")

# In-memory candidate reference repository (clean abstraction)
_CANDIDATE_REFERENCES: Dict[str, Dict[str, Any]] = {}

# In-memory search jobs repository
_SEARCH_JOBS: Dict[str, Dict[str, Any]] = {}

class CandidateRepository:
    @staticmethod
    def save_reference(
        candidate_id: str,
        face_id: str,
        embedding: List[float],
        quality_score: float,
        quality_label: str,
        roll_number: Optional[str] = None,
        candidate_name: Optional[str] = None
    ) -> CandidateReference:
        reference_id = f"ref_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Store internal record with embedding
        _CANDIDATE_REFERENCES[candidate_id] = {
            "candidate_id": candidate_id,
            "reference_id": reference_id,
            "face_id": face_id,
            "embedding": embedding,
            "embedding_dimension": len(embedding),
            "quality_score": quality_score,
            "quality_label": quality_label,
            "roll_number": roll_number,
            "candidate_name": candidate_name,
            "created_at": now_iso
        }
        
        # Also index by face_id and reference_id for quick lookups
        _CANDIDATE_REFERENCES[reference_id] = _CANDIDATE_REFERENCES[candidate_id]
        _CANDIDATE_REFERENCES[face_id] = _CANDIDATE_REFERENCES[candidate_id]

        return CandidateReference(
            candidate_id=candidate_id,
            reference_id=reference_id,
            face_id=face_id,
            roll_number=roll_number,
            candidate_name=candidate_name,
            embedding_available=True,
            embedding_dimension=len(embedding),
            quality_score=quality_score,
            quality_label=quality_label,
            created_at=now_iso
        )

    @staticmethod
    def get_embedding(identifier: str) -> Optional[List[float]]:
        """Retrieves raw embedding internally for matching. Never exposed via API."""
        record = _CANDIDATE_REFERENCES.get(identifier)
        if record:
            return record.get("embedding")
        return None

    @staticmethod
    def get_reference(identifier: str) -> Optional[CandidateReference]:
        record = _CANDIDATE_REFERENCES.get(identifier)
        if not record:
            return None
        return CandidateReference(
            candidate_id=record["candidate_id"],
            reference_id=record["reference_id"],
            face_id=record["face_id"],
            roll_number=record.get("roll_number"),
            candidate_name=record.get("candidate_name"),
            embedding_available=True,
            embedding_dimension=record.get("embedding_dimension", 128),
            quality_score=record["quality_score"],
            quality_label=record["quality_label"],
            created_at=record["created_at"]
        )

    @staticmethod
    def exists(identifier: str) -> bool:
        return identifier in _CANDIDATE_REFERENCES

class SearchJobManager:
    @staticmethod
    def create_job(
        candidate_id: str,
        selected_video_ids: List[str],
        config: Optional[SearchConfig] = None,
        case_id: Optional[str] = None
    ) -> str:
        search_id = f"search_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cfg = config or SearchConfig()

        _SEARCH_JOBS[search_id] = {
            "search_id": search_id,
            "case_id": case_id,
            "candidate_id": candidate_id,
            "status": "QUEUED",
            "current_phase": "IDLE",
            "progress_percent": 0.0,
            "videos_total": len(selected_video_ids),
            "videos_processed": 0,
            "selected_video_ids": selected_video_ids,
            "current_video": None,
            "current_timestamp": None,
            "frames_processed": 0,
            "faces_detected": 0,
            "potential_matches": 0,
            "verified_matches": 0,
            "verification_status": None,
            "verification_events_total": 0,
            "verification_events_processed": 0,
            "verification_frames_processed": 0,
            "verification_faces_detected": 0,
            "verification_matches": 0,
            "processing_fps": 0.0,
            "elapsed_seconds": 0.0,
            "estimated_remaining_seconds": 0.0,
            "config": cfg.dict(),
            "created_at": now_iso,
            "started_at": None,
            "completed_at": None,
            "error": None,
            "results": [],
            "raw_matches": [],
            "pass2_matches": []
        }
        return search_id

    @staticmethod
    def get_job_status(search_id: str) -> Optional[SearchStatusResponse]:
        job = _SEARCH_JOBS.get(search_id)
        if not job:
            return None
        # Copy and format results
        job_data = dict(job)
        job_data.pop("raw_matches", None)
        formatted_results = []
        for r in job_data.get("results", []):
            if isinstance(r, dict):
                bbox = r.get("bounding_box")
                if isinstance(bbox, dict):
                    r_copy = dict(r)
                    r_copy["bounding_box"] = BoundingBox(**bbox)
                    formatted_results.append(SearchResultMatchSchema(**r_copy))
                else:
                    formatted_results.append(SearchResultMatchSchema(**r))
            else:
                formatted_results.append(r)
        job_data["results"] = formatted_results

        # Format pass2_matches if present
        raw_p2 = job_data.get("pass2_matches", [])
        formatted_p2 = []
        for m in raw_p2:
            if isinstance(m, dict):
                m_copy = dict(m)
                bbox = m_copy.get("bounding_box")
                if isinstance(bbox, dict):
                    m_copy["bounding_box"] = BoundingBox(**bbox)
                formatted_p2.append(RawFaceMatch(**m_copy))
            else:
                formatted_p2.append(m)
        job_data["pass2_matches"] = formatted_p2

        return SearchStatusResponse(**job_data)

    @staticmethod
    def get_raw_matches(search_id: str) -> List[RawFaceMatch]:
        job = _SEARCH_JOBS.get(search_id)
        if not job:
            return []
        return [RawFaceMatch(**m) if isinstance(m, dict) else m for m in job.get("raw_matches", [])]

    @staticmethod
    def get_pass2_matches(search_id: str) -> List[RawFaceMatch]:
        job = _SEARCH_JOBS.get(search_id)
        if not job:
            return []
        return [RawFaceMatch(**m) if isinstance(m, dict) else m for m in job.get("pass2_matches", [])]

    @staticmethod
    def update_job_status(search_id: str, **updates: Any) -> bool:
        job = _SEARCH_JOBS.get(search_id)
        if not job:
            return False
        job.update(updates)
        return True

    @staticmethod
    def update_match_clip(search_id: str, event_id: str, clip_id: str) -> bool:
        job = _SEARCH_JOBS.get(search_id)
        if not job:
            return False
        results = job.get("results", [])
        updated = False
        for r in results:
            if (isinstance(r, dict) and r.get("id") == event_id) or (hasattr(r, "id") and getattr(r, "id") == event_id):
                if isinstance(r, dict):
                    r["clip_generated"] = True
                    r["clip_id"] = clip_id
                else:
                    setattr(r, "clip_generated", True)
                    setattr(r, "clip_id", clip_id)
                updated = True
        return updated


    @staticmethod
    def list_jobs() -> List[SearchStatusResponse]:
        return [SearchJobManager.get_job_status(jid) for jid in _SEARCH_JOBS.keys() if SearchJobManager.get_job_status(jid) is not None]

    @classmethod
    async def execute_search_scan(cls, search_id: str):
        """
        Stage E CCTV sequential scan and real-time face matching worker.
        Iterates across selected videos, samples frames at requested sampling_fps,
        extracts faces via FaceEngine, computes cosine similarity against candidate embedding,
        and streams live progress and match telemetry to SearchJob state.
        """
        job = _SEARCH_JOBS.get(search_id)
        if not job:
            logger.error(f"Cannot execute search job '{search_id}': Job not found.")
            return

        cls.update_job_status(
            search_id,
            status="RUNNING",
            current_phase="PASS 1 SCANNING",
            started_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )

        cfg = job.get("config", {})
        sampling_fps = cfg.get("sampling_fps", 3.0)
        match_threshold = cfg.get("match_threshold", 0.60)
        high_confidence_threshold = cfg.get("high_confidence_threshold", 0.75)
        selected_videos = job.get("selected_video_ids", [])
        total_videos = len(selected_videos)
        case_id = job.get("case_id")
        candidate_id = job.get("candidate_id")

        # Load candidate embedding once per search job
        candidate_embedding = CandidateRepository.get_embedding(candidate_id)
        if not candidate_embedding:
            logger.error(f"Candidate embedding not found for candidate '{candidate_id}' in SearchJob '{search_id}'.")
            cls.update_job_status(
                search_id,
                status="FAILED",
                completed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                error=f"CANDIDATE_EMBEDDING_NOT_FOUND: Candidate '{candidate_id}' has no registered embedding."
            )
            return

        start_time = time.time()
        total_frames_sampled = 0
        total_faces_detected = 0
        total_potential_matches = 0
        total_verified_matches = 0
        video_errors = []
        raw_matches_list: List[Dict[str, Any]] = []
        results_list: List[Dict[str, Any]] = []

        try:
            for vid_idx, video_identifier in enumerate(selected_videos):
                cls.update_job_status(
                    search_id,
                    current_video=video_identifier,
                    current_timestamp="00:00:00"
                )

                # Locate video file safely
                resolved_path = resolve_video_path(video_identifier, case_id=case_id)
                if not resolved_path or not resolved_path.is_file():
                    err_msg = f"VIDEO_NOT_FOUND: Video file '{video_identifier}' not found in storage."
                    logger.warning(err_msg)
                    video_errors.append(err_msg)
                    cls.update_job_status(
                        search_id,
                        videos_processed=vid_idx + 1,
                        progress_percent=round(((vid_idx + 1) / max(total_videos, 1)) * 100.0, 1)
                    )
                    continue

                try:
                    metadata = video_engine.get_video_metadata(resolved_path, video_id=video_identifier)
                    video_duration = metadata.duration_seconds
                    video_frames = metadata.frame_count

                    # Sequentially sample frames
                    for sampled_frame in video_engine.sample_frames(resolved_path, sampling_fps=sampling_fps, video_id=video_identifier):
                        total_frames_sampled += 1
                        ts_sec = sampled_frame.timestamp_seconds
                        hrs = int(ts_sec // 3600)
                        mins = int((ts_sec % 3600) // 60)
                        secs = int(ts_sec % 60)
                        current_ts_str = f"{hrs:02d}:{mins:02d}:{secs:02d}"

                        elapsed = max(time.time() - start_time, 0.001)
                        processing_fps = total_frames_sampled / elapsed

                        # Face Detection & Feature Extraction via Phase 1.6 FaceEngine
                        detected_faces = []
                        if face_engine and face_engine.biometric_engine_ready and sampled_frame.frame is not None:
                            try:
                                detected_faces = face_engine.detect_and_extract_face_features(sampled_frame.frame)
                            except Exception as fe_err:
                                logger.warning(f"Face extraction notice for frame {sampled_frame.frame_index} of {video_identifier}: {fe_err}")

                        total_faces_detected += len(detected_faces)

                        # Biometric Similarity Matching via MatchingEngine
                        if detected_faces and candidate_embedding:
                            frame_matches = matching_engine.match_frame_faces(
                                candidate_embedding=candidate_embedding,
                                detected_faces=detected_faces,
                                search_id=search_id,
                                candidate_id=candidate_id,
                                video_id=video_identifier,
                                frame_index=sampled_frame.frame_index,
                                timestamp_seconds=sampled_frame.timestamp_seconds,
                                match_threshold=match_threshold,
                                high_confidence_threshold=high_confidence_threshold,
                                case_id=case_id,
                                camera_name=video_identifier
                            )

                            for match in frame_matches:
                                raw_matches_list.append(match.dict())
                                total_potential_matches += 1
                                if match.confidence_band == "High":
                                    total_verified_matches += 1

                        # Approximate progress
                        video_progress = (sampled_frame.frame_index / max(video_frames, 1)) if video_frames > 0 else 0.5
                        overall_progress = min(round(((vid_idx + video_progress) / max(total_videos, 1)) * 100.0, 1), 99.9)

                        # Estimate remaining
                        est_remaining = 0.0
                        if overall_progress > 0:
                            est_total_time = elapsed / (overall_progress / 100.0)
                            est_remaining = max(0.0, est_total_time - elapsed)

                        # Update progress periodically (every 5 frames or when match found)
                        if total_frames_sampled % 5 == 0 or len(detected_faces) > 0:
                            # Group current raw matches into appearance events for results preview
                            current_events = temporal_grouper.group_matches(raw_matches_list, cfg)
                            current_results = [ev.to_search_result_match().dict() for ev in current_events]

                            cls.update_job_status(
                                search_id,
                                frames_processed=total_frames_sampled,
                                faces_detected=total_faces_detected,
                                potential_matches=total_potential_matches,
                                verified_matches=total_verified_matches,
                                current_timestamp=current_ts_str,
                                processing_fps=round(processing_fps, 1),
                                elapsed_seconds=round(elapsed, 1),
                                estimated_remaining_seconds=round(est_remaining, 1),
                                progress_percent=overall_progress,
                                results=current_results,
                                raw_matches=[dict(m) for m in raw_matches_list]
                            )
                            # Yield control to event loop
                            await asyncio.sleep(0.001)

                except Exception as vid_err:
                    err_msg = f"VIDEO_PROCESSING_FAILED for '{video_identifier}': {str(vid_err)}"
                    logger.error(err_msg)
                    video_errors.append(err_msg)

                cls.update_job_status(
                    search_id,
                    videos_processed=vid_idx + 1,
                    progress_percent=round(((vid_idx + 1) / max(total_videos, 1)) * 100.0, 1)
                )

            # Final Stage F Appearance Event Aggregation across all videos
            appearance_events = temporal_grouper.group_matches(raw_matches_list, cfg)

            # Stage H: Two-Pass Candidate Verification & Dense Event Refinement
            pass2_raw_matches_list: List[Dict[str, Any]] = []
            verif_enabled = bool(cfg.get("verification_enabled", True))
            verif_final_status = "DISABLED"
            verif_events_total = len(appearance_events)
            verif_events_processed = 0
            verif_frames_processed = 0
            verif_faces_detected = 0
            verif_matches_count = 0

            if verif_enabled and appearance_events:
                cls.update_job_status(
                    search_id,
                    current_phase="PASS 2 VERIFYING",
                    verification_status="RUNNING",
                    verification_events_total=verif_events_total
                )

                def _path_resolver(vid: str):
                    return resolve_video_path(vid, case_id=case_id)

                def _telemetry_cb(t: Dict[str, Any]):
                    cls.update_job_status(
                        search_id,
                        verification_events_processed=t.get("events_processed", 0),
                        verification_frames_processed=t.get("frames_processed", 0),
                        verification_faces_detected=t.get("faces_detected", 0),
                        verification_matches=t.get("matches_found", 0)
                    )

                refined_events, pass2_matches, verif_telemetry = verification_engine.verify_appearance_events(
                    events=appearance_events,
                    video_path_resolver=_path_resolver,
                    candidate_embedding=candidate_embedding,
                    config=cfg,
                    telemetry_callback=_telemetry_cb
                )

                final_events = refined_events
                pass2_raw_matches_list = [m.dict() for m in pass2_matches]
                verif_final_status = "COMPLETED"
                verif_events_processed = verif_telemetry.get("events_processed", len(refined_events))
                verif_frames_processed = verif_telemetry.get("total_frames_sampled", 0)
                verif_faces_detected = verif_telemetry.get("total_faces_detected", 0)
                verif_matches_count = len(pass2_matches)
                total_verified_matches = sum(1 for e in refined_events if e.verification_status == "VERIFIED" and e.confidence_band == "High")
            elif not verif_enabled:
                final_events = [ev.copy(update={"verification_status": "UNVERIFIED"}) for ev in appearance_events]
                verif_final_status = "DISABLED"
            else:
                final_events = []
                verif_final_status = "COMPLETED"

            results_list = [ev.to_search_result_match().dict() for ev in final_events]

            # Deterministic sorting of results: (video_id, event_start_seconds, id)
            results_list.sort(key=lambda r: (r.get("video_id", ""), r.get("event_start_seconds", 0.0), r.get("id", "")))

            # Finalize Job State
            elapsed_total = max(time.time() - start_time, 0.001)
            final_status = "COMPLETED"
            error_summary = "; ".join(video_errors) if video_errors else None
            if len(video_errors) == total_videos and total_videos > 0:
                final_status = "FAILED"

            cls.update_job_status(
                search_id,
                status=final_status,
                current_phase="COMPLETED" if final_status == "COMPLETED" else "FAILED",
                progress_percent=100.0 if final_status == "COMPLETED" else round(job.get("progress_percent", 0.0), 1),
                frames_processed=total_frames_sampled,
                faces_detected=total_faces_detected,
                potential_matches=total_potential_matches,
                verified_matches=total_verified_matches,
                verification_status=verif_final_status,
                verification_events_total=verif_events_total,
                verification_events_processed=verif_events_processed,
                verification_frames_processed=verif_frames_processed,
                verification_faces_detected=verif_faces_detected,
                verification_matches=verif_matches_count,
                videos_processed=total_videos,
                processing_fps=round(total_frames_sampled / elapsed_total, 1),
                elapsed_seconds=round(elapsed_total, 1),
                estimated_remaining_seconds=0.0,
                completed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                error=error_summary,
                results=results_list,
                raw_matches=raw_matches_list,
                pass2_matches=pass2_raw_matches_list
            )
            logger.info(
                f"SearchJob {search_id} finished with status={final_status}, "
                f"frames={total_frames_sampled}, faces={total_faces_detected}, "
                f"potential_matches={total_potential_matches}, verified_matches={total_verified_matches}, "
                f"elapsed={round(elapsed_total, 1)}s"
            )

        except Exception as e:
            logger.exception(f"Unexpected failure executing search job '{search_id}': {str(e)}")
            cls.update_job_status(
                search_id,
                status="FAILED",
                completed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                error=f"SEARCH_EXECUTION_FAILED: {str(e)}"
            )

