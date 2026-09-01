import os
import json
import uuid
import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from backend.config import STORAGE_DIR

CASES_DIR = STORAGE_DIR / "cases"
UPLOADS_DIR = STORAGE_DIR / "uploads"
VIDEOS_DIR = STORAGE_DIR / "videos"
CLIPS_DIR = STORAGE_DIR / "clips"
THUMBNAILS_DIR = STORAGE_DIR / "thumbnails"

# Ensure directories exist
for d in (CASES_DIR, UPLOADS_DIR, VIDEOS_DIR, CLIPS_DIR, THUMBNAILS_DIR):
    d.mkdir(parents=True, exist_ok=True)

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".ts", ".m4v"}

def sanitize_filename(filename: str) -> str:
    """Removes path traversals and invalid characters."""
    normalized = str(filename).replace("\\", "/")
    clean_name = Path(normalized).name
    # Keep only alphanumeric, dashes, dots, underscores
    sanitized = "".join(c for c in clean_name if c.isalnum() or c in ("-", "_", "."))
    return sanitized or f"file_{uuid.uuid4().hex[:8]}"


def get_safe_path(base_dir: Path, target_path: str) -> Path:
    """Ensures target path does not escape the base directory (prevents path traversal)."""
    resolved_base = base_dir.resolve()
    resolved_target = (base_dir / target_path).resolve()
    if not str(resolved_target).startswith(str(resolved_base)):
        raise ValueError(f"Path traversal attempted: {target_path}")
    return resolved_target

def resolve_video_path(video_identifier: str, case_id: Optional[str] = None) -> Optional[Path]:
    """
    Safely locates a video file across permitted storage locations:
    1. case-specific directory (storage/cases/{case_id}/videos/)
    2. general videos directory (storage/videos/)
    3. uploads directory (storage/uploads/)
    4. direct safe path if already absolute inside STORAGE_DIR
    """
    clean_name = sanitize_filename(video_identifier)
    
    # Check case folder if case_id provided
    if case_id:
        safe_case = sanitize_filename(case_id)
        case_vid = CASES_DIR / safe_case / "videos" / clean_name
        if case_vid.is_file():
            return case_vid

    # Check VIDEOS_DIR
    vid_path = VIDEOS_DIR / clean_name
    if vid_path.is_file():
        return vid_path

    # Check UPLOADS_DIR
    upload_path = UPLOADS_DIR / clean_name
    if upload_path.is_file():
        return upload_path

    # Check if target is a direct relative path in STORAGE_DIR
    try:
        direct_path = get_safe_path(STORAGE_DIR, video_identifier)
        if direct_path.is_file():
            return direct_path
    except Exception:
        pass

    return None

def get_clips_directory(case_id: Optional[str] = None) -> Path:
    """Returns the approved storage directory for evidence clips."""
    if case_id:
        safe_case = sanitize_filename(case_id)
        target = CASES_DIR / safe_case / "clips"
        target.mkdir(parents=True, exist_ok=True)
        return target
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    return CLIPS_DIR

def resolve_clip_path(clip_identifier: str, case_id: Optional[str] = None) -> Optional[Path]:
    """
    Safely resolves a clip file inside the approved clips directory boundaries.
    Prevents path traversal.
    """
    clean_name = sanitize_filename(clip_identifier)
    if not clean_name.endswith(".mp4"):
        clean_name = f"{clean_name}.mp4"

    # Check case clips if case_id provided
    if case_id:
        safe_case = sanitize_filename(case_id)
        case_clip = CASES_DIR / safe_case / "clips" / clean_name
        if case_clip.is_file():
            return case_clip

    # Check global CLIPS_DIR
    global_clip = CLIPS_DIR / clean_name
    if global_clip.is_file():
        return global_clip

    # Check any case folder
    if CASES_DIR.is_dir():
        for case_dir in CASES_DIR.iterdir():
            if case_dir.is_dir():
                sub_clip = case_dir / "clips" / clean_name
                if sub_clip.is_file():
                    return sub_clip

    return None

