import logging
import math
import uuid
import datetime
from typing import List, Dict, Any, Optional, Union

from backend.models.schemas import (
    RawFaceMatch,
    AppearanceEvent,
    SearchResultMatchSchema,
    BoundingBox,
    FacialLandmarks,
    SearchConfig
)

logger = logging.getLogger("TemporalGrouper")


class TemporalGrouper:
    """
    Stage F: Temporal Match Grouping & Appearance Event Aggregation.
    Aggregates frame-level RawFaceMatch records from Stage E into continuous
    appearance events based on time continuity, video isolation, and peak similarity.
    """

    @classmethod
    def group_matches(
        cls,
        raw_matches: List[Union[RawFaceMatch, Dict[str, Any]]],
        config: Optional[Union[SearchConfig, Dict[str, Any]]] = None,
        match_gap_tolerance_seconds: Optional[float] = None,
        min_event_duration_seconds: Optional[float] = None,
        match_threshold: Optional[float] = None,
        high_confidence_threshold: Optional[float] = None,
        filter_min_duration: bool = False
    ) -> List[AppearanceEvent]:
        """
        Groups raw frame-level face matches into continuous appearance events.

        Parameters:
        - raw_matches: List of RawFaceMatch models or dicts from Stage E
        - config: SearchConfig or dict containing grouping parameters
        - match_gap_tolerance_seconds: Maximum time gap (sec) between matches to group (overrides config)
        - min_event_duration_seconds: Minimum event duration threshold (overrides config)
        - match_threshold: Similarity score threshold for match (overrides config)
        - high_confidence_threshold: Threshold for High confidence band (overrides config)
        - filter_min_duration: If True, filters out events with duration < min_event_duration_seconds

        Returns:
        - List of AppearanceEvent models deterministically sorted by (video_id, start_time_seconds, event_id)
        """
        if not raw_matches:
            return []

        # 1. Resolve configuration parameters dynamically
        cfg_dict: Dict[str, Any] = {}
        if config:
            if hasattr(config, "dict") and callable(config.dict):
                cfg_dict = config.dict()
            elif isinstance(config, dict):
                cfg_dict = config

        gap_tolerance = (
            match_gap_tolerance_seconds
            if match_gap_tolerance_seconds is not None
            else cfg_dict.get("match_gap_tolerance_seconds", 3.0)
        )
        min_duration = (
            min_event_duration_seconds
            if min_event_duration_seconds is not None
            else cfg_dict.get("min_event_duration_seconds", 1.0)
        )
        thresh_match = (
            match_threshold
            if match_threshold is not None
            else cfg_dict.get("match_threshold", 0.60)
        )
        thresh_high = (
            high_confidence_threshold
            if high_confidence_threshold is not None
            else cfg_dict.get("high_confidence_threshold", 0.75)
        )

        # 2. Normalize and sanitize raw matches into standard dict records
        normalized_records: List[Dict[str, Any]] = []
        for item in raw_matches:
            rec = cls._normalize_raw_match(item)
            if rec is not None:
                normalized_records.append(rec)

        if not normalized_records:
            return []

        # 3. Deduplicate exact duplicate detections in the same frame/face
        deduped_records = cls._deduplicate_matches(normalized_records)

        # 4. Partition matches strictly by video_id (Cameras NEVER merge)
        video_partitions: Dict[str, List[Dict[str, Any]]] = {}
        for rec in deduped_records:
            vid = rec.get("video_id") or "UNKNOWN_VIDEO"
            if vid not in video_partitions:
                video_partitions[vid] = []
            video_partitions[vid].append(rec)

        all_events: List[AppearanceEvent] = []

        # 5. Process each video independently
        for vid, records in video_partitions.items():
            # Sort chronologically by timestamp_seconds, then frame_index, then face_index, then match_id
            records.sort(
                key=lambda r: (
                    float(r.get("timestamp_seconds", 0.0)),
                    int(r.get("frame_index", 0)),
                    int(r.get("face_index", 0) if r.get("face_index") is not None else 0),
                    str(r.get("match_id", ""))
                )
            )

            # Cluster matches within match_gap_tolerance_seconds
            current_cluster: List[Dict[str, Any]] = [records[0]]

            for rec in records[1:]:
                prev_rec = current_cluster[-1]
                prev_ts = float(prev_rec.get("timestamp_seconds", 0.0))
                curr_ts = float(rec.get("timestamp_seconds", 0.0))
                gap = max(0.0, curr_ts - prev_ts)

                if gap <= gap_tolerance:
                    current_cluster.append(rec)
                else:
                    # Close current event
                    event = cls._build_appearance_event(
                        cluster=current_cluster,
                        high_confidence_threshold=thresh_high,
                        match_threshold=thresh_match
                    )
                    all_events.append(event)
                    current_cluster = [rec]

            if current_cluster:
                event = cls._build_appearance_event(
                    cluster=current_cluster,
                    high_confidence_threshold=thresh_high,
                    match_threshold=thresh_match
                )
                all_events.append(event)

        # 6. Apply minimum event duration filtering if requested
        if filter_min_duration and min_duration > 0:
            filtered_events = [e for e in all_events if e.duration_seconds >= min_duration]
            all_events = filtered_events

        # 7. Deterministic sorting: (video_id, start_time_seconds, event_id)
        all_events.sort(
            key=lambda e: (
                e.video_id,
                e.start_time_seconds,
                e.event_id
            )
        )

        return all_events

    @classmethod
    def _normalize_raw_match(cls, item: Union[RawFaceMatch, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Standardizes a RawFaceMatch instance or dictionary into a clean dictionary."""
        if hasattr(item, "dict") and callable(item.dict):
            d = item.dict()
        elif isinstance(item, dict):
            d = dict(item)
        else:
            return None

        # Ensure required fields exist
        if "video_id" not in d or "timestamp_seconds" not in d:
            return None

        # Normalize bounding box
        bbox = d.get("bounding_box", {})
        if hasattr(bbox, "dict") and callable(bbox.dict):
            bbox = bbox.dict()
        elif not isinstance(bbox, dict):
            bbox = {}

        d["bounding_box"] = {
            "x": int(bbox.get("x", 0)),
            "y": int(bbox.get("y", 0)),
            "width": int(bbox.get("width", 0)),
            "height": int(bbox.get("height", 0))
        }

        # Normalize facial landmarks
        landmarks = d.get("facial_landmarks")
        if landmarks:
            if hasattr(landmarks, "dict") and callable(landmarks.dict):
                d["facial_landmarks"] = landmarks.dict()
            elif isinstance(landmarks, dict):
                d["facial_landmarks"] = landmarks
            else:
                d["facial_landmarks"] = None
        else:
            d["facial_landmarks"] = None

        return d

    @classmethod
    def _deduplicate_matches(cls, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deduplicates records with identical (video_id, frame_index, face_index, timestamp_seconds).
        Preserves the record with highest similarity score.
        """
        seen: Dict[tuple, Dict[str, Any]] = {}
        for rec in records:
            key = (
                rec.get("video_id"),
                rec.get("frame_index"),
                rec.get("face_index"),
                round(float(rec.get("timestamp_seconds", 0.0)), 4)
            )
            if key in seen:
                # Keep highest similarity score
                existing = seen[key]
                if float(rec.get("similarity_score", 0.0)) > float(existing.get("similarity_score", 0.0)):
                    seen[key] = rec
            else:
                seen[key] = rec

        return list(seen.values())

    @classmethod
    def _build_appearance_event(
        cls,
        cluster: List[Dict[str, Any]],
        high_confidence_threshold: float = 0.75,
        match_threshold: float = 0.60
    ) -> AppearanceEvent:
        """
        Aggregates a temporal cluster of frame matches into a single AppearanceEvent.
        """
        first = cluster[0]
        last = cluster[-1]

        start_time = float(first.get("timestamp_seconds", 0.0))
        end_time = float(last.get("timestamp_seconds", 0.0))
        duration = max(0.0, end_time - start_time)

        # Find peak match (highest similarity score; on tie, pick earliest timestamp/frame)
        peak_rec = cluster[0]
        best_score = float(peak_rec.get("similarity_score", -1.0))
        best_ts = float(peak_rec.get("timestamp_seconds", 0.0))
        best_frame = int(peak_rec.get("frame_index", 0))

        for rec in cluster[1:]:
            score = float(rec.get("similarity_score", -1.0))
            ts = float(rec.get("timestamp_seconds", 0.0))
            frame_idx = int(rec.get("frame_index", 0))

            if score > best_score:
                peak_rec = rec
                best_score = score
                best_ts = ts
                best_frame = frame_idx
            elif math.isclose(score, best_score, abs_tol=1e-7):
                # Tie breaker: earliest timestamp, then lowest frame index
                if ts < best_ts or (math.isclose(ts, best_ts, abs_tol=1e-7) and frame_idx < best_frame):
                    peak_rec = rec
                    best_score = score
                    best_ts = ts
                    best_frame = frame_idx

        # Traceable confidence band classification based on peak similarity
        if best_score >= high_confidence_threshold:
            confidence_band = "High"
        elif best_score >= match_threshold:
            confidence_band = "Medium"
        else:
            confidence_band = "Low"

        # Bounding Box and Landmarks for peak representative frame
        peak_bbox_dict = peak_rec.get("bounding_box", {})
        peak_bbox = BoundingBox(
            x=int(peak_bbox_dict.get("x", 0)),
            y=int(peak_bbox_dict.get("y", 0)),
            width=int(peak_bbox_dict.get("width", 0)),
            height=int(peak_bbox_dict.get("height", 0))
        )

        peak_landmarks = None
        raw_lm = peak_rec.get("facial_landmarks")
        if raw_lm and isinstance(raw_lm, dict):
            peak_landmarks = FacialLandmarks(**raw_lm)

        event_id = f"event_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        return AppearanceEvent(
            event_id=event_id,
            search_id=str(first.get("search_id", "")),
            case_id=first.get("case_id"),
            candidate_id=str(first.get("candidate_id", "")),
            reference_id=first.get("reference_id"),
            video_id=str(first.get("video_id", "")),
            camera_name=first.get("camera_name") or str(first.get("video_id", "")),
            start_time_seconds=start_time,
            end_time_seconds=end_time,
            duration_seconds=round(duration, 4),
            peak_similarity=best_score,
            peak_timestamp_seconds=best_ts,
            peak_frame_index=int(peak_rec.get("frame_index", 0)),
            peak_bounding_box=peak_bbox,
            peak_facial_landmarks=peak_landmarks,
            frame_match_count=len(cluster),
            confidence_band=confidence_band,
            thumbnail_url=None,
            clip_id=None,
            clip_generated=False,
            created_at=now_iso
        )


# Singleton instance for import convenience
temporal_grouper = TemporalGrouper()
