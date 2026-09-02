import unittest
import os
import io
import tempfile
import shutil
from pathlib import Path
from backend.services.storage_manager import (
    ALLOWED_VIDEO_EXTENSIONS,
    VIDEOS_DIR,
    sanitize_filename,
    get_safe_path
)
from backend.models.schemas import VideoMetadataResponse, VideoListResponse
from backend.services.video_engine import VideoEngine

class TestStageIVideos(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.test_path = Path(self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_sanitize_filename(self):
        self.assertEqual(sanitize_filename("../../etc/passwd.mp4"), "passwd.mp4")
        self.assertEqual(sanitize_filename("C:\\Users\\admin\\video.mp4"), "video.mp4")
        self.assertEqual(sanitize_filename("cam 01 (entrance).mp4"), "cam01entrance.mp4")

    def test_get_safe_path_prevents_traversal(self):
        base = self.test_path / "videos"
        base.mkdir(parents=True, exist_ok=True)
        
        safe = get_safe_path(base, "camera_01.mp4")
        self.assertTrue(str(safe).startswith(str(base.resolve())))
        
        with self.assertRaises(ValueError):
            get_safe_path(base, "../../../secret.txt")

    def test_allowed_extensions(self):
        self.assertIn(".mp4", ALLOWED_VIDEO_EXTENSIONS)
        self.assertIn(".avi", ALLOWED_VIDEO_EXTENSIONS)
        self.assertIn(".mov", ALLOWED_VIDEO_EXTENSIONS)
        self.assertIn(".mkv", ALLOWED_VIDEO_EXTENSIONS)
        self.assertNotIn(".exe", ALLOWED_VIDEO_EXTENSIONS)
        self.assertNotIn(".sh", ALLOWED_VIDEO_EXTENSIONS)

    def test_video_metadata_schema(self):
        resp = VideoMetadataResponse(
            video_id="vid_12345",
            filename="gate_01.mp4",
            file_size_bytes=1048576,
            duration_seconds=60.0,
            fps=25.0,
            width=1920,
            height=1080,
            codec="h264",
            camera_name="Main Gate"
        )
        self.assertEqual(resp.video_id, "vid_12345")
        self.assertEqual(resp.fps, 25.0)
        self.assertEqual(resp.width, 1920)

    def test_video_list_schema(self):
        resp = VideoListResponse(
            videos=[
                VideoMetadataResponse(
                    video_id="vid_1",
                    filename="gate_01.mp4",
                    file_size_bytes=1048576,
                    duration_seconds=60.0,
                    fps=25.0,
                    width=1920,
                    height=1080,
                    codec="h264"
                )
            ],
            total_count=1
        )
        self.assertEqual(resp.total_count, 1)
        self.assertEqual(len(resp.videos), 1)

if __name__ == "__main__":
    unittest.main()
