from __future__ import annotations
import logging
import math
import time
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union, Callable

try:
    import numpy as np
except ImportError:
    np = None

from backend.models.schemas import (
    AppearanceEvent,
    RawFaceMatch,
    BoundingBox,
    FacialLandmarks,
    SearchConfig
)
from backend.services.face_engine import face_engine, FaceEngine
from backend.services.matching_engine import matching_engine, MatchingEngine
from backend.services.video_engine import video_engine, VideoEngine

logger = logging.getLogger("VerificationEngine")

STATUS_VERIFIED = "VERIFIED"
STATUS_REJECTED = "REJECTED"
STATUS_INCONCLUSIVE = "INCONCLUSIVE"
STATUS_UNVERIFIED = "UNVERIFIED"


class VerificationEngine:
    """
    Phase 2 — Stage H: Two-Pass Candidate Verification & Dense Event Refinement Engine.
    Executes dense, localized biometric verification over Stage F AppearanceEvent windows.
    Refines temporal boundaries, peak similarity, bounding boxes, and forensic classifications
    without rescanning the entire video stream.
    """

    STATUS_VERIFIED = STATUS_VERIFIED
    STATUS_REJECTED = STATUS_REJECTED
    STATUS_INCONCLUSIVE = STATUS_INCONCLUSIVE
    STATUS_UNVERIFIED = STATUS_UNVERIFIED

    @classmethod
    def calculate_verification_window(
        cls,
        start_time_seconds: float,
        end_time_seconds: float,
        video_duration_seconds: float,
        padding_seconds: float = 3.0
    ) -> Tuple[float, float, float]:
        """
        Calculates safe [verification_start, verification_end, window_duration] around an AppearanceEvent.
        Clamps strictly within [0.0, video_duration_seconds].
        """
        if start_time_seconds < 0.0 or end_time_seconds < 0.0:
            raise ValueError(f"INVALID_VERIFICATION_WINDOW: Event timestamps cannot be negative ({start_time_seconds}, {end_time_seconds}).")

        if end_time_seconds < start_time_seconds:
            raise ValueError(f"INVALID_VERIFICATION_WINDOW: end_time ({end_time_seconds}) must be >= start_time ({start_time_seconds}).")

        pad = max(0.0, float(padding_seconds))
        win_start = max(0.0, float(start_time_seconds) - pad)

        if video_duration_seconds > 0.0:
            win_end = min(float(video_duration_seconds), float(end_time_seconds) + pad)
        else:
            win_end = float(end_time_seconds) + pad

        if win_end <= win_start:
            raise ValueError(
                f"INVALID_VERIFICATION_WINDOW: Calculated window end ({win_end:.3f}s) <= start ({win_start:.3f}s) "
                f"for event [{start_time_seconds:.3f}, {end_time_seconds:.3f}] with duration {video_duration_seconds:.3f}s."
            )

        duration = max(0.0, win_end - win_start)
        return (round(win_start, 4), round(win_end, 4), round(duration, 4))

    @classmethod
    def verify_single_event(
        cls,
        event: Union[AppearanceEvent, Dict[str, Any]],
        video_path: Union[str, Path],
        candidate_embedding: Any,
        config: Optional[Union[SearchConfig, Dict[str, Any]]] = None,
        face_engine_instance: Optional[FaceEngine] = None,
        matching_engine_instance: Optional[MatchingEngine] = None,
        video_engine_instance: Optional[VideoEngine] = None
    ) -> Tuple[AppearanceEvent, List[RawFaceMatch], Dict[str, Any]]:
        """
        Executes dense Pass 2 verification on a single Stage F AppearanceEvent.
        Returns:
            (refined_appearance_event, pass2_raw_matches, telemetry_dict)
        """
        fe = face_engine_instance or face_engine
        me = matching_engine_instance or matching_engine
        ve = video_engine_instance or video_engine

        # Normalize event object if dict
        if isinstance(event, dict):
            # Construct AppearanceEvent from dict if needed
            ev_obj = AppearanceEvent(**event)
        else:
            ev_obj = event

        started_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        t0 = time.time()

        # Parse config options
        cfg_dict: Dict[str, Any] = {}
        if config:
            if hasattr(config, "dict") and callable(config.dict):
                cfg_dict = config.dict()
            elif isinstance(config, dict):
                cfg_dict = config

        padding_seconds = float(cfg_dict.get("verification_padding_seconds", 3.0))
        dense_sampling_fps = float(cfg_dict.get("verification_sampling_fps", 10.0))
        match_thresh = float(cfg_dict.get("verification_threshold") or cfg_dict.get("match_threshold", 0.60))
        high_thresh = float(cfg_dict.get("verification_high_confidence_threshold") or cfg_dict.get("high_confidence_threshold", 0.75))
        min_matches = int(cfg_dict.get("min_verification_matches", 2))
        min_duration_sec = float(cfg_dict.get("min_verification_duration_seconds", 0.5))

        # Get video metadata
        metadata = ve.get_video_metadata(video_path, video_id=ev_obj.video_id)
        video_duration = metadata.duration_seconds
        src_fps = metadata.fps if metadata.fps > 0 else 25.0
        effective_sampling_fps = min(dense_sampling_fps, src_fps)

        # Calculate bounded verification window
        win_start, win_end, win_dur = cls.calculate_verification_window(
            start_time_seconds=ev_obj.start_time_seconds,
            end_time_seconds=ev_obj.end_time_seconds,
            video_duration_seconds=video_duration,
            padding_seconds=padding_seconds
        )

        pass2_matches: List[RawFaceMatch] = []
        frames_sampled = 0
        faces_detected = 0

        # Sample frames within the verification window
        for sampled_frame in ve.sample_frames_in_window(
            file_path=video_path,
            start_time_seconds=win_start,
            end_time_seconds=win_end,
            sampling_fps=effective_sampling_fps,
            video_id=ev_obj.video_id
        ):
            frames_sampled += 1

            if sampled_frame.frame is None:
                continue

            frame_faces = []
            if fe and fe.biometric_engine_ready:
                try:
                    frame_faces = fe.detect_and_extract_face_features(sampled_frame.frame)
                except Exception as ex:
                    logger.warning(f"Face extraction notice during Pass 2 frame {sampled_frame.frame_index}: {ex}")

            faces_detected += len(frame_faces)

            if frame_faces and candidate_embedding is not None:
                frame_matches = me.match_frame_faces(
                    candidate_embedding=candidate_embedding,
                    detected_faces=frame_faces,
                    search_id=ev_obj.search_id,
                    candidate_id=ev_obj.candidate_id,
                    video_id=ev_obj.video_id,
                    frame_index=sampled_frame.frame_index,
                    timestamp_seconds=sampled_frame.timestamp_seconds,
                    match_threshold=match_thresh,
                    high_confidence_threshold=high_thresh,
                    case_id=ev_obj.case_id,
                    camera_name=ev_obj.camera_name
                )
                pass2_matches.extend(frame_matches)

        completed_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        elapsed_sec = max(time.time() - t0, 0.001)

        # Determine Verification Status
        decision = STATUS_REJECTED
        refined_start = ev_obj.start_time_seconds
        refined_end = ev_obj.end_time_seconds
        refined_duration = ev_obj.duration_seconds
        refined_peak_sim = ev_obj.peak_similarity
        refined_peak_ts = ev_obj.peak_timestamp_seconds
        refined_peak_frame = ev_obj.peak_frame_index
        refined_peak_bbox = ev_obj.peak_bounding_box
        refined_peak_landmarks = ev_obj.peak_facial_landmarks
        refined_match_count = len(pass2_matches)
        refined_confidence_band = ev_obj.confidence_band

        if len(pass2_matches) == 0:
            decision = STATUS_REJECTED
            refined_confidence_band = "Low"
        else:
            # Sort Pass 2 matches chronologically
            pass2_matches_sorted = sorted(pass2_matches, key=lambda m: (m.timestamp_seconds, m.frame_index))
            refined_start = pass2_matches_sorted[0].timestamp_seconds
            refined_end = pass2_matches_sorted[-1].timestamp_seconds
            refined_duration = max(0.0, refined_end - refined_start)

            # Peak match selection: highest similarity; on tie, earliest timestamp & lowest frame index
            peak_match = pass2_matches_sorted[0]
            for m in pass2_matches_sorted[1:]:
                if m.similarity_score > peak_match.similarity_score:
                    peak_match = m
                elif math.isclose(m.similarity_score, peak_match.similarity_score, abs_tol=1e-7):
                    if m.timestamp_seconds < peak_match.timestamp_seconds or (
                        math.isclose(m.timestamp_seconds, peak_match.timestamp_seconds, abs_tol=1e-7) and m.frame_index < peak_match.frame_index
                    ):
                        peak_match = m

            refined_peak_sim = peak_match.similarity_score
            refined_peak_ts = peak_match.timestamp_seconds
            refined_peak_frame = peak_match.frame_index
            refined_peak_bbox = peak_match.bounding_box
            refined_peak_landmarks = peak_match.facial_landmarks
            refined_confidence_band = peak_match.confidence_band

            # Qualification check:
            # Multi-frame event or single frame event
            effective_min_matches = 1 if (ev_obj.frame_match_count <= 1 and win_dur <= 2.0) else min_matches

            if len(pass2_matches) >= effective_min_matches and refined_peak_sim >= match_thresh:
                decision = STATUS_VERIFIED
            elif len(pass2_matches) > 0 and refined_peak_sim >= (match_thresh - 0.05):
                decision = STATUS_INCONCLUSIVE
            else:
                decision = STATUS_REJECTED

        # Build Refined AppearanceEvent preserving forensic history
        refined_event = AppearanceEvent(
            event_id=ev_obj.event_id,
            search_id=ev_obj.search_id,
            case_id=ev_obj.case_id,
            candidate_id=ev_obj.candidate_id,
            reference_id=ev_obj.reference_id,
            video_id=ev_obj.video_id,
            camera_name=ev_obj.camera_name,
            start_time_seconds=round(refined_start, 4),
            end_time_seconds=round(refined_end, 4),
            duration_seconds=round(refined_duration, 4),
            peak_similarity=round(refined_peak_sim, 4),
            peak_timestamp_seconds=round(refined_peak_ts, 4),
            peak_frame_index=refined_peak_frame,
            peak_bounding_box=refined_peak_bbox,
            peak_facial_landmarks=refined_peak_landmarks,
            frame_match_count=refined_match_count if decision == STATUS_VERIFIED else ev_obj.frame_match_count,
            confidence_band=refined_confidence_band,
            thumbnail_url=ev_obj.thumbnail_url,
            clip_id=ev_obj.clip_id,
            clip_generated=ev_obj.clip_generated,
            verification_status=decision,
            pass1_event_id=ev_obj.event_id,
            pass1_start_time=round(ev_obj.start_time_seconds, 4),
            pass1_end_time=round(ev_obj.end_time_seconds, 4),
            pass1_peak_similarity=round(ev_obj.peak_similarity, 4),
            verification_started_at=started_iso,
            verification_completed_at=completed_iso,
            verification_sampling_fps=effective_sampling_fps,
            verification_frame_count=frames_sampled,
            verification_faces_detected=faces_detected,
            verification_match_count=len(pass2_matches),
            verification_peak_similarity=round(refined_peak_sim, 4) if len(pass2_matches) > 0 else 0.0,
            created_at=ev_obj.created_at or started_iso
        )

        telemetry = {
            "event_id": ev_obj.event_id,
            "decision": decision,
            "frames_sampled": frames_sampled,
            "faces_detected": faces_detected,
            "pass2_matches_count": len(pass2_matches),
            "window_start": win_start,
            "window_end": win_end,
            "elapsed_seconds": round(elapsed_sec, 3)
        }

        return refined_event, pass2_matches, telemetry

    @classmethod
    def verify_appearance_events(
        cls,
        events: List[AppearanceEvent],
        video_path_resolver: Callable[[str], Optional[Path]],
        candidate_embedding: Any,
        config: Optional[Union[SearchConfig, Dict[str, Any]]] = None,
        telemetry_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Tuple[List[AppearanceEvent], List[RawFaceMatch], Dict[str, Any]]:
        """
        Executes dense Pass 2 verification across a batch of Stage F AppearanceEvents.
        Strictly preserves camera isolation.
        """
        if not events:
            return [], [], {
                "events_total": 0,
                "events_processed": 0,
                "total_frames_sampled": 0,
                "total_faces_detected": 0,
                "total_pass2_matches": 0,
                "verified_count": 0,
                "rejected_count": 0,
                "inconclusive_count": 0
            }

        refined_events: List[AppearanceEvent] = []
        all_pass2_matches: List[RawFaceMatch] = []
        total_frames = 0
        total_faces = 0
        verified_count = 0
        rejected_count = 0
        inconclusive_count = 0

        # Group events by video_id to enforce multi-camera isolation
        for idx, ev in enumerate(events):
            vid_path = video_path_resolver(ev.video_id)
            if not vid_path or not vid_path.is_file():
                logger.warning(f"Verification could not locate video path for '{ev.video_id}'. Marking event INCONCLUSIVE.")
                unresolved_ev = ev.copy(update={
                    "verification_status": STATUS_INCONCLUSIVE,
                    "pass1_event_id": ev.event_id,
                    "pass1_start_time": ev.start_time_seconds,
                    "pass1_end_time": ev.end_time_seconds,
                    "pass1_peak_similarity": ev.peak_similarity,
                    "verification_match_count": 0
                })
                refined_events.append(unresolved_ev)
                inconclusive_count += 1
                continue

            refined_ev, pass2_matches, telem = cls.verify_single_event(
                event=ev,
                video_path=vid_path,
                candidate_embedding=candidate_embedding,
                config=config
            )

            refined_events.append(refined_ev)
            all_pass2_matches.extend(pass2_matches)

            total_frames += telem.get("frames_sampled", 0)
            total_faces += telem.get("faces_detected", 0)

            if refined_ev.verification_status == STATUS_VERIFIED:
                verified_count += 1
            elif refined_ev.verification_status == STATUS_REJECTED:
                rejected_count += 1
            else:
                inconclusive_count += 1

            if telemetry_callback:
                telemetry_callback({
                    "events_total": len(events),
                    "events_processed": idx + 1,
                    "current_event_id": ev.event_id,
                    "current_status": refined_ev.verification_status,
                    "frames_processed": total_frames,
                    "faces_detected": total_faces,
                    "matches_found": len(all_pass2_matches)
                })

        # Deterministic sorting: (video_id, start_time_seconds, event_id)
        refined_events.sort(key=lambda e: (e.video_id, e.start_time_seconds, e.event_id))

        summary_telemetry = {
            "events_total": len(events),
            "events_processed": len(refined_events),
            "total_frames_sampled": total_frames,
            "total_faces_detected": total_faces,
            "total_pass2_matches": len(all_pass2_matches),
            "verified_count": verified_count,
            "rejected_count": rejected_count,
            "inconclusive_count": inconclusive_count
        }

        return refined_events, all_pass2_matches, summary_telemetry


# Global singleton instance
verification_engine = VerificationEngine()
