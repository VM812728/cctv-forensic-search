import os
import uuid
import datetime
import logging
from pathlib import Path
from typing import List, Optional

try:
    from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
except ImportError:
    class APIRouter:
        def __init__(self, *args, **kwargs): pass
        def post(self, *args, **kwargs): return lambda f: f
        def get(self, *args, **kwargs): return lambda f: f
        def delete(self, *args, **kwargs): return lambda f: f
    class HTTPException(Exception):
        def __init__(self, status_code, detail):
            self.status_code = status_code
            self.detail = detail
            super().__init__(f"{status_code}: {detail}")
    def UploadFile(*args, **kwargs): return None
    def File(*args, **kwargs): return None
    def Form(*args, **kwargs): return None
    def Query(*args, **kwargs): return None

from backend.models.schemas import VideoMetadataResponse, VideoListResponse
from backend.services.storage_manager import (
    ALLOWED_VIDEO_EXTENSIONS,
    VIDEOS_DIR,
    sanitize_filename,
    get_safe_path
)
from backend.services.video_engine import VideoEngine

logger = logging.getLogger("VideosAPI")

router = APIRouter(prefix="/videos", tags=["CCTV Video Management"])

@router.post("/upload", response_model=VideoMetadataResponse)
async def upload_video_endpoint(
    file: UploadFile = File(...),
    camera_name: Optional[str] = Form(None)
):
    """
    Accepts multipart CCTV video upload, validates file extension against allowed formats,
    sanitizes filename, prevents path traversal, writes file safely into storage/videos/,
    generates unique video_id, and extracts video metadata.
    """
    original_filename = file.filename or "cctv_recording.mp4"
    clean_filename = sanitize_filename(original_filename)
    suffix = Path(clean_filename).suffix.lower()

    if suffix not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"INVALID_FILE_EXTENSION: '{suffix}' is not supported. Allowed: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}"
        )

    # Generate unique video ID and destination path
    vid_uuid = uuid.uuid4().hex[:12]
    unique_filename = f"{Path(clean_filename).stem}_{vid_uuid}{suffix}"
    
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    destination_path = get_safe_path(VIDEOS_DIR, unique_filename)

    # Save uploaded file
    try:
        with open(destination_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                f.write(chunk)
    except Exception as e:
        logger.error(f"Failed to save uploaded video file: {e}")
        if destination_path.exists():
            destination_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to store video: {str(e)}")

    video_id = f"vid_{vid_uuid}_{clean_filename}"

    # Extract metadata using VideoEngine
    try:
        metadata = VideoEngine.get_video_metadata(destination_path, video_id=video_id)
        return VideoMetadataResponse(
            video_id=video_id,
            filename=unique_filename,
            file_size_bytes=metadata.file_size_bytes,
            duration_seconds=metadata.duration_seconds,
            fps=metadata.fps,
            width=metadata.width,
            height=metadata.height,
            codec=metadata.codec,
            camera_name=camera_name or Path(clean_filename).stem,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
    except Exception as meta_err:
        logger.warning(f"VideoEngine metadata warning: {meta_err}")
        # Fallback stat
        file_size = destination_path.stat().st_size
        return VideoMetadataResponse(
            video_id=video_id,
            filename=unique_filename,
            file_size_bytes=file_size,
            duration_seconds=0.0,
            fps=25.0,
            width=1920,
            height=1080,
            codec="h264",
            camera_name=camera_name or Path(clean_filename).stem,
            created_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )

@router.get("", response_model=VideoListResponse)
async def list_videos_endpoint():
    """
    Lists all available CCTV videos stored in storage/videos/.
    """
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    video_list: List[VideoMetadataResponse] = []

    for item in sorted(VIDEOS_DIR.iterdir()):
        if item.is_file() and item.suffix.lower() in ALLOWED_VIDEO_EXTENSIONS:
            clean_name = item.name
            vid_id = f"vid_{clean_name}"
            try:
                meta = VideoEngine.get_video_metadata(item, video_id=vid_id)
                video_list.append(VideoMetadataResponse(
                    video_id=vid_id,
                    filename=clean_name,
                    file_size_bytes=meta.file_size_bytes,
                    duration_seconds=meta.duration_seconds,
                    fps=meta.fps,
                    width=meta.width,
                    height=meta.height,
                    codec=meta.codec,
                    camera_name=item.stem,
                    created_at=datetime.datetime.fromtimestamp(item.stat().st_mtime, tz=datetime.timezone.utc).isoformat()
                ))
            except Exception:
                file_size = item.stat().st_size
                video_list.append(VideoMetadataResponse(
                    video_id=vid_id,
                    filename=clean_name,
                    file_size_bytes=file_size,
                    duration_seconds=0.0,
                    fps=25.0,
                    width=1920,
                    height=1080,
                    codec="unknown",
                    camera_name=item.stem,
                    created_at=datetime.datetime.fromtimestamp(item.stat().st_mtime, tz=datetime.timezone.utc).isoformat()
                ))

    return VideoListResponse(videos=video_list, total_count=len(video_list))

@router.delete("/{video_id}")
async def delete_video_endpoint(video_id: str):
    """
    Deletes a video file from storage/videos/.
    """
    clean_id = sanitize_filename(video_id)
    # Search in VIDEOS_DIR
    target: Optional[Path] = None
    for item in VIDEOS_DIR.iterdir():
        if item.is_file() and (item.name == clean_id or f"vid_{item.name}" == video_id or clean_id in item.name):
            target = item
            break

    if not target or not target.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    try:
        target.unlink()
        return {"status": "SUCCESS", "message": f"Deleted {target.name}", "video_id": video_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")
