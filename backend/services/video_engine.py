from __future__ import annotations
import os
import time
import math
import logging
from pathlib import Path
from typing import Generator, Optional, Dict, Any, Union, NamedTuple
from dataclasses import dataclass

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    np = None
    CV2_AVAILABLE = False

from backend.services.storage_manager import (
    ALLOWED_VIDEO_EXTENSIONS,
    get_safe_path,
    STORAGE_DIR
)

logger = logging.getLogger("VideoEngine")

@dataclass
class VideoMetadata:
    video_id: str
    file_path: str
    fps: float
    frame_count: int
    duration_seconds: float
    width: int
    height: int
    codec: str
    file_size_bytes: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "video_id": self.video_id,
            "file_path": self.file_path,
            "fps": self.fps,
            "frame_count": self.frame_count,
            "duration_seconds": self.duration_seconds,
            "width": self.width,
            "height": self.height,
            "codec": self.codec,
            "file_size_bytes": self.file_size_bytes
        }

@dataclass
class SampledFrame:
    frame: Any  # np.ndarray
    timestamp_seconds: float
    frame_index: int
    source_video_id: str

class VideoEngine:
    """
    High-performance, sequential CCTV Video Processing & Frame Sampling Engine.
    Streams frames one by one to avoid buffering long CCTV footage in memory.
    """

    @staticmethod
    def _decode_fourcc(fourcc_val: float) -> str:
        try:
            val = int(fourcc_val)
            chars = [chr((val >> 8 * i) & 0xFF) for i in range(4)]
            codec = "".join(chars).strip()
            return codec or "unknown"
        except Exception:
            return "unknown"

    @classmethod
    def validate_video_file(cls, file_path: Union[str, Path]) -> Path:
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(f"VIDEO_NOT_FOUND: Video file '{file_path}' does not exist.")
        
        # Enforce extension whitelist
        if path.suffix.lower() not in ALLOWED_VIDEO_EXTENSIONS:
            raise ValueError(
                f"INVALID_VIDEO_FORMAT: File extension '{path.suffix}' is not supported. "
                f"Allowed: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}"
            )
        return path

    @classmethod
    def _get_metadata_via_ffprobe(cls, valid_path: Path, vid_id: str) -> VideoMetadata:
        import subprocess
        import shutil
        ffprobe_bin = shutil.which("ffprobe") or "/usr/bin/ffprobe"
        cmd = [
            ffprobe_bin,
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,r_frame_rate,nb_frames,duration,codec_name:format=duration,size",
            "-of", "default=noprint_wrappers=1",
            str(valid_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFPROBE_FAILED: Could not read video metadata: {res.stderr}")

        props = {}
        for line in res.stdout.splitlines():
            if "=" in line:
                k, v = line.strip().split("=", 1)
                props[k] = v

        width = int(props.get("width", 0))
        height = int(props.get("height", 0))
        codec = props.get("codec_name", "h264")

        # Parse FPS
        r_fps = props.get("r_frame_rate", "25/1")
        try:
            if "/" in r_fps:
                num, den = r_fps.split("/")
                fps = float(num) / float(den) if float(den) != 0 else 25.0
            else:
                fps = float(r_fps)
        except Exception:
            fps = 25.0

        # Parse duration
        duration_str = props.get("duration", "0")
        try:
            duration = float(duration_str)
        except Exception:
            duration = 0.0

        # Parse frame count
        nb_frames_str = props.get("nb_frames")
        if nb_frames_str and nb_frames_str.isdigit():
            frame_count = int(nb_frames_str)
        else:
            frame_count = int(duration * fps)

        file_size = valid_path.stat().st_size

        return VideoMetadata(
            video_id=vid_id,
            file_path=str(valid_path),
            fps=round(fps, 3),
            frame_count=frame_count,
            duration_seconds=round(duration, 3),
            width=width,
            height=height,
            codec=codec,
            file_size_bytes=file_size
        )

    @classmethod
    def get_video_metadata(cls, file_path: Union[str, Path], video_id: Optional[str] = None) -> VideoMetadata:
        """
        Extracts video container and stream properties without decoding full video.
        """
        valid_path = cls.validate_video_file(file_path)
        vid_id = video_id or valid_path.name

        if not CV2_AVAILABLE:
            return cls._get_metadata_via_ffprobe(valid_path, vid_id)

        cap = cv2.VideoCapture(str(valid_path))
        if not cap.isOpened():
            return cls._get_metadata_via_ffprobe(valid_path, vid_id)


        try:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fourcc = cap.get(cv2.CAP_PROP_FOURCC)
            codec = cls._decode_fourcc(fourcc)
            file_size = valid_path.stat().st_size

            # Fallback checks
            if fps <= 0.0 or math.isnan(fps) or math.isinf(fps):
                # Try estimating or fail with explicit error
                fps = 25.0  # Fallback default if stream header missing
                logger.warning(f"Video '{valid_path.name}' reported invalid FPS. Defaulting to 25.0.")

            if frame_count <= 0:
                duration = 0.0
            else:
                duration = frame_count / fps

            return VideoMetadata(
                video_id=vid_id,
                file_path=str(valid_path),
                fps=fps,
                frame_count=frame_count,
                duration_seconds=duration,
                width=width,
                height=height,
                codec=codec,
                file_size_bytes=file_size
            )
        finally:
            cap.release()

    @classmethod
    def sample_frames(
        cls,
        file_path: Union[str, Path],
        sampling_fps: float = 3.0,
        video_id: Optional[str] = None
    ) -> Generator[SampledFrame, None, None]:
        """
        Sequentially reads and yields frames according to the requested sampling FPS.
        Uses mathematically accurate timestamp intervals to prevent accumulated timing drift.
        Only one frame matrix resides in memory per iteration.
        """
        if sampling_fps <= 0.0:
            raise ValueError(f"INVALID_SAMPLING_FPS: sampling_fps must be > 0 (got {sampling_fps}).")

        metadata = cls.get_video_metadata(file_path, video_id=video_id)
        src_fps = metadata.fps
        vid_id = metadata.video_id

        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened():
            raise RuntimeError(f"VIDEO_OPEN_FAILED: Failed to open video stream for sampling '{file_path}'.")

        sample_interval = 1.0 / sampling_fps
        half_src_frame = 0.5 / src_fps
        next_sample_timestamp = 0.0
        frame_idx = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                current_timestamp = frame_idx / src_fps

                # Check if this frame hits or passes the next sampling target
                if current_timestamp >= next_sample_timestamp - half_src_frame:
                    yield SampledFrame(
                        frame=frame,
                        timestamp_seconds=current_timestamp,
                        frame_index=frame_idx,
                        source_video_id=vid_id
                    )
                    
                    # Advance sampling target
                    next_sample_timestamp += sample_interval
                    while next_sample_timestamp <= current_timestamp:
                        next_sample_timestamp += sample_interval

                frame_idx += 1
        finally:
            cap.release()

    @classmethod
    def sample_frames_in_window(
        cls,
        file_path: Union[str, Path],
        start_time_seconds: float = 0.0,
        end_time_seconds: Optional[float] = None,
        sampling_fps: float = 10.0,
        video_id: Optional[str] = None
    ) -> Generator[SampledFrame, None, None]:
        """
        Stage H: Sequentially reads and yields frames specifically within [start_time_seconds, end_time_seconds]
        at the requested sampling_fps (dense verification sampling).
        Seeks directly to start_time_seconds to avoid decoding the whole video from the beginning.
        Only one frame matrix resides in memory per iteration.
        """
        if sampling_fps <= 0.0:
            raise ValueError(f"INVALID_SAMPLING_FPS: sampling_fps must be > 0 (got {sampling_fps}).")

        metadata = cls.get_video_metadata(file_path, video_id=video_id)
        src_fps = metadata.fps if metadata.fps > 0 else 25.0
        vid_id = metadata.video_id
        duration = metadata.duration_seconds

        win_start = max(0.0, float(start_time_seconds))
        if end_time_seconds is not None:
            win_end = min(duration, float(end_time_seconds)) if duration > 0 else float(end_time_seconds)
        else:
            win_end = duration

        if win_end <= win_start:
            return

        effective_sampling_fps = min(sampling_fps, src_fps)
        sample_interval = 1.0 / effective_sampling_fps
        half_src_frame = 0.5 / src_fps

        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened():
            raise RuntimeError(f"VIDEO_OPEN_FAILED: Failed to open video stream for window sampling '{file_path}'.")

        try:
            # Fast seek to start frame
            start_frame = int(win_start * src_fps)
            if start_frame > 0:
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
                pos_frames = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
                frame_idx = pos_frames if pos_frames >= 0 else start_frame
            else:
                frame_idx = 0

            next_sample_timestamp = win_start

            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                current_timestamp = frame_idx / src_fps

                if current_timestamp > win_end + half_src_frame:
                    break

                if current_timestamp >= next_sample_timestamp - half_src_frame:
                    yield SampledFrame(
                        frame=frame,
                        timestamp_seconds=current_timestamp,
                        frame_index=frame_idx,
                        source_video_id=vid_id
                    )
                    next_sample_timestamp += sample_interval
                    while next_sample_timestamp <= current_timestamp:
                        next_sample_timestamp += sample_interval

                frame_idx += 1
        finally:
            cap.release()

# Global Singleton
video_engine = VideoEngine()
