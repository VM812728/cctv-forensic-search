import os
import shutil
import hashlib
import uuid
import datetime
import subprocess
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Union, List

from backend.config import STORAGE_DIR, TEMP_DIR
from backend.models.schemas import (
    ClipEvidence,
    AppearanceEvent,
    SearchResultMatchSchema,
    ExtractClipRequest
)
from backend.services.storage_manager import (
    resolve_video_path,
    resolve_clip_path,
    get_clips_directory,
    sanitize_filename,
    get_safe_path,
    ALLOWED_VIDEO_EXTENSIONS
)
from backend.services.video_engine import video_engine, VideoEngine

logger = logging.getLogger("ClipExtractor")

# In-memory storage repository for forensic clip evidence records
_CLIP_REGISTRY: Dict[str, ClipEvidence] = {}
# Index by (search_id, event_id) and by event_id for fast duplicate lookup
_EVENT_CLIP_INDEX: Dict[str, str] = {}


class ClipRepository:
    """In-memory registry and lookup service for generated forensic clip evidence."""

    @staticmethod
    def register_clip(clip: ClipEvidence) -> None:
        _CLIP_REGISTRY[clip.clip_id] = clip
        _EVENT_CLIP_INDEX[clip.event_id] = clip.clip_id
        if clip.search_id:
            key = f"{clip.search_id}_{clip.event_id}"
            _EVENT_CLIP_INDEX[key] = clip.clip_id

    @staticmethod
    def get_clip(clip_id: str) -> Optional[ClipEvidence]:
        return _CLIP_REGISTRY.get(clip_id)

    @staticmethod
    def get_clip_by_event(event_id: str, search_id: Optional[str] = None) -> Optional[ClipEvidence]:
        if search_id:
            key = f"{search_id}_{event_id}"
            if key in _EVENT_CLIP_INDEX:
                clip_id = _EVENT_CLIP_INDEX[key]
                return _CLIP_REGISTRY.get(clip_id)
        if event_id in _EVENT_CLIP_INDEX:
            clip_id = _EVENT_CLIP_INDEX[event_id]
            return _CLIP_REGISTRY.get(clip_id)
        return None

    @staticmethod
    def list_clips(case_id: Optional[str] = None) -> List[ClipEvidence]:
        if case_id:
            return [c for c in _CLIP_REGISTRY.values() if c.case_id == case_id]
        return list(_CLIP_REGISTRY.values())

    @staticmethod
    def clear() -> None:
        _CLIP_REGISTRY.clear()
        _EVENT_CLIP_INDEX.clear()


class ClipExtractor:
    """
    Automated Forensic Video Clip Extraction Engine.
    Uses FFmpeg for stream copy and fallback frame-accurate re-encoding.
    Computes SHA-256 byte hashes and handles atomic file creation.
    """

    FFMPEG_BINARY: Optional[str] = None

    @classmethod
    def get_ffmpeg_binary(cls) -> str:
        """Locates and validates the FFmpeg executable path."""
        if cls.FFMPEG_BINARY and Path(cls.FFMPEG_BINARY).is_file():
            return cls.FFMPEG_BINARY

        # Check environment or default locations
        candidates = [
            os.getenv("FFMPEG_PATH"),
            shutil.which("ffmpeg"),
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg"
        ]

        for cand in candidates:
            if cand and Path(cand).is_file() and os.access(cand, os.X_OK):
                cls.FFMPEG_BINARY = str(cand)
                return cls.FFMPEG_BINARY

        raise RuntimeError("FFMPEG_NOT_AVAILABLE: FFmpeg executable could not be found or is not executable.")

    @staticmethod
    def compute_sha256(file_path: Union[str, Path]) -> str:
        """Calculates SHA-256 hash of the generated evidence file bytes."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def calculate_clip_window(
        cls,
        start_time_seconds: float,
        end_time_seconds: float,
        video_duration_seconds: float,
        pre_roll_seconds: float = 5.0,
        post_roll_seconds: float = 5.0
    ) -> tuple[float, float, float]:
        """
        Calculates safe [clip_start, clip_end, duration] time window bounded within source duration.
        Never produces negative timestamps and never exceeds video duration.
        """
        if start_time_seconds < 0.0 or end_time_seconds < 0.0:
            raise ValueError(f"INVALID_CLIP_WINDOW: Event timestamps cannot be negative ({start_time_seconds}, {end_time_seconds}).")

        if end_time_seconds < start_time_seconds:
            raise ValueError(f"INVALID_CLIP_WINDOW: end_time ({end_time_seconds}) must be >= start_time ({start_time_seconds}).")

        clip_start = max(0.0, float(start_time_seconds) - max(0.0, float(pre_roll_seconds)))

        if video_duration_seconds > 0.0:
            clip_end = min(float(video_duration_seconds), float(end_time_seconds) + max(0.0, float(post_roll_seconds)))
        else:
            clip_end = float(end_time_seconds) + max(0.0, float(post_roll_seconds))

        if clip_end <= clip_start:
            raise ValueError(
                f"INVALID_CLIP_WINDOW: Calculated clip_end ({clip_end:.3f}s) is <= clip_start ({clip_start:.3f}s)."
            )

        duration = round(clip_end - clip_start, 3)
        return round(clip_start, 3), round(clip_end, 3), duration

    @classmethod
    def extract_clip(
        cls,
        source_video: Union[str, Path],
        event_id: str,
        start_time_seconds: float,
        end_time_seconds: float,
        peak_timestamp_seconds: float,
        peak_similarity: float,
        search_id: Optional[str] = None,
        case_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
        reference_id: Optional[str] = None,
        camera_name: Optional[str] = None,
        video_id: Optional[str] = None,
        pre_roll_seconds: float = 5.0,
        post_roll_seconds: float = 5.0,
        force_reencode: bool = False
    ) -> ClipEvidence:
        """
        Extracts a forensically verified video evidence clip for an appearance event.
        Attempts fast stream copy first, falling back to frame-accurate libx264 re-encoding.
        """
        # 1. Check duplicate cache first
        existing = ClipRepository.get_clip_by_event(event_id, search_id)
        if existing and not force_reencode:
            # Check if file still exists on disk and is non-empty
            existing_path = resolve_clip_path(existing.clip_id, case_id)
            if existing_path and existing_path.is_file() and existing_path.stat().st_size > 0:
                logger.info(f"Returning existing valid clip {existing.clip_id} for event {event_id}.")
                return existing

        # 2. Validate and Resolve Source Video
        if isinstance(source_video, Path):
            src_path = source_video
        else:
            resolved = resolve_video_path(str(source_video), case_id=case_id)
            if not resolved:
                raise FileNotFoundError(f"VIDEO_NOT_FOUND: Source CCTV video '{source_video}' not found in storage.")
            src_path = resolved

        if not src_path.is_file():
            raise FileNotFoundError(f"VIDEO_NOT_FOUND: Source CCTV video file '{src_path}' does not exist.")

        if src_path.suffix.lower() not in ALLOWED_VIDEO_EXTENSIONS:
            raise ValueError(f"INVALID_VIDEO_FORMAT: Unsupported source video extension '{src_path.suffix}'.")

        # 3. Read Real Source Metadata & Duration
        try:
            metadata = video_engine.get_video_metadata(src_path, video_id=video_id or src_path.name)
            src_duration = metadata.duration_seconds
        except Exception as e:
            raise RuntimeError(f"SOURCE_VIDEO_UNREADABLE: Could not read metadata from '{src_path.name}': {str(e)}")

        # 4. Calculate Safe Bounded Clip Window
        clip_start, clip_end, clip_duration = cls.calculate_clip_window(
            start_time_seconds=start_time_seconds,
            end_time_seconds=end_time_seconds,
            video_duration_seconds=src_duration,
            pre_roll_seconds=pre_roll_seconds,
            post_roll_seconds=post_roll_seconds
        )

        # 5. Prepare Output Paths
        ffmpeg_bin = cls.get_ffmpeg_binary()
        clip_uuid = f"clip_{uuid.uuid4().hex[:12]}"
        output_filename = f"{clip_uuid}.mp4"

        TEMP_DIR.mkdir(parents=True, exist_ok=True)
        temp_output_path = TEMP_DIR / f"temp_{clip_uuid}.mp4"

        clips_dest_dir = get_clips_directory(case_id=case_id)
        final_output_path = clips_dest_dir / output_filename

        extraction_method = "stream_copy"

        # 6. Execute FFmpeg Extraction
        try:
            if not force_reencode:
                # Attempt Fast Stream-Copy First
                # Keyframe boundary cutting; ultrafast without decoding overhead
                stream_copy_cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-ss", str(clip_start),
                    "-to", str(clip_end),
                    "-i", str(src_path),
                    "-c", "copy",
                    "-avoid_negative_ts", "make_zero",
                    str(temp_output_path)
                ]

                logger.debug(f"Attempting stream-copy: {' '.join(stream_copy_cmd)}")
                res = subprocess.run(
                    stream_copy_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=60
                )

                # Validate stream copy result
                if res.returncode != 0 or not temp_output_path.is_file() or temp_output_path.stat().st_size == 0:
                    logger.warning(f"Stream-copy failed (code {res.returncode}). Falling back to libx264 re-encoding.")
                    if temp_output_path.is_file():
                        temp_output_path.unlink()
                    extraction_method = "re_encoded"
                else:
                    # Test if playable/readable
                    try:
                        test_meta = video_engine.get_video_metadata(temp_output_path)
                        if test_meta.duration_seconds <= 0.0:
                            extraction_method = "re_encoded"
                    except Exception:
                        extraction_method = "re_encoded"
            else:
                extraction_method = "re_encoded"

            # Execute Accurate Re-encoding Fallback
            if extraction_method == "re_encoded":
                if temp_output_path.is_file():
                    temp_output_path.unlink()

                # Frame-accurate cutting with libx264
                reencode_cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-ss", str(clip_start),
                    "-to", str(clip_end),
                    "-i", str(src_path),
                    "-c:v", "libx264",
                    "-crf", "20",
                    "-preset", "fast",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    "-avoid_negative_ts", "make_zero",
                    str(temp_output_path)
                ]

                logger.debug(f"Executing re-encode: {' '.join(reencode_cmd)}")
                res_re = subprocess.run(
                    reencode_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=120
                )

                if res_re.returncode != 0 or not temp_output_path.is_file() or temp_output_path.stat().st_size == 0:
                    # Retry without audio if audio stream caused issue
                    reencode_no_audio = [
                        ffmpeg_bin,
                        "-y",
                        "-ss", str(clip_start),
                        "-to", str(clip_end),
                        "-i", str(src_path),
                        "-c:v", "libx264",
                        "-crf", "20",
                        "-preset", "fast",
                        "-pix_fmt", "yuv420p",
                        "-an",
                        "-avoid_negative_ts", "make_zero",
                        str(temp_output_path)
                    ]
                    res_no_audio = subprocess.run(
                        reencode_no_audio,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=120
                    )
                    if res_no_audio.returncode != 0 or not temp_output_path.is_file() or temp_output_path.stat().st_size == 0:
                        stderr_msg = res_no_audio.stderr.decode("utf-8", errors="ignore")
                        raise RuntimeError(f"FFMPEG_EXTRACTION_FAILED: FFmpeg failed to extract clip. Stderr: {stderr_msg[-300:]}")

            # 7. Validate Output & File Size
            if not temp_output_path.is_file() or temp_output_path.stat().st_size == 0:
                raise RuntimeError("CLIP_OUTPUT_INVALID: Generated clip file is empty (0 bytes).")

            file_size = temp_output_path.stat().st_size

            # 8. Compute Forensic SHA-256 Hash of the Generated Clip
            sha256_hash = cls.compute_sha256(temp_output_path)

            # 9. Atomic Move to Final Destination Path
            shutil.move(str(temp_output_path), str(final_output_path))

            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            # 10. Build Structured ClipEvidence
            evidence = ClipEvidence(
                clip_id=clip_uuid,
                event_id=event_id,
                search_id=search_id,
                case_id=case_id,
                candidate_id=candidate_id,
                reference_id=reference_id,
                video_id=video_id or src_path.name,
                camera_name=camera_name or f"Camera {video_id or src_path.name}",
                source_video_filename=src_path.name,
                output_filename=output_filename,
                clip_path=str(final_output_path),
                clip_start_seconds=clip_start,
                clip_end_seconds=clip_end,
                duration_seconds=clip_duration,
                peak_timestamp_seconds=peak_timestamp_seconds,
                peak_similarity=peak_similarity,
                sha256=sha256_hash,
                file_size_bytes=file_size,
                mime_type="video/mp4",
                extraction_method=extraction_method,
                created_at=now_iso
            )

            # Register in Repository
            ClipRepository.register_clip(evidence)
            logger.info(f"Successfully generated clip {clip_uuid} ({extraction_method}, {file_size} bytes, sha256: {sha256_hash[:8]}...)")
            return evidence

        except Exception as err:
            # Clean up temp file on error
            if temp_output_path.is_file():
                try:
                    temp_output_path.unlink()
                except Exception:
                    pass
            logger.error(f"Clip extraction failed for event {event_id}: {str(err)}")
            raise

    @classmethod
    def extract_from_event(
        cls,
        event: AppearanceEvent,
        pre_roll_seconds: float = 5.0,
        post_roll_seconds: float = 5.0,
        force_reencode: bool = False
    ) -> ClipEvidence:
        """Helper to extract clip directly from an AppearanceEvent schema."""
        return cls.extract_clip(
            source_video=event.video_id,
            event_id=event.event_id,
            start_time_seconds=event.start_time_seconds,
            end_time_seconds=event.end_time_seconds,
            peak_timestamp_seconds=event.peak_timestamp_seconds,
            peak_similarity=event.peak_similarity,
            search_id=event.search_id,
            case_id=event.case_id,
            candidate_id=event.candidate_id,
            reference_id=event.reference_id,
            camera_name=event.camera_name,
            video_id=event.video_id,
            pre_roll_seconds=pre_roll_seconds,
            post_roll_seconds=post_roll_seconds,
            force_reencode=force_reencode
        )


# Global Singleton
clip_extractor = ClipExtractor()
