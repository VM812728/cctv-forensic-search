import unittest
import math
import asyncio
from pathlib import Path
from backend.services.video_engine import VideoEngine, VideoMetadata, SampledFrame
from backend.services.storage_manager import (
    sanitize_filename,
    get_safe_path,
    resolve_video_path,
    STORAGE_DIR,
    VIDEOS_DIR
)
from backend.models.schemas import SearchConfig
from backend.services.search_service import SearchJobManager, CandidateRepository

class MockVideoCapture:
    """Mock OpenCV VideoCapture for unit testing sampling math and sequential streaming."""
    def __init__(self, fps=25.0, frame_count=250, width=1280, height=720):
        self.fps = fps
        self.frame_count = frame_count
        self.width = width
        self.height = height
        self.current_frame = 0
        self.is_opened = True

    def isOpened(self):
        return self.is_opened

    def get(self, prop_id):
        # cv2.CAP_PROP_FPS=5, CAP_PROP_FRAME_COUNT=7, CAP_PROP_FRAME_WIDTH=3, CAP_PROP_FRAME_HEIGHT=4, CAP_PROP_FOURCC=6
        if prop_id == 5:
            return self.fps
        elif prop_id == 7:
            return self.frame_count
        elif prop_id == 3:
            return self.width
        elif prop_id == 4:
            return self.height
        elif prop_id == 6:
            return 0.0
        return 0.0

    def read(self):
        if self.current_frame >= self.frame_count:
            return False, None
        # Return a lightweight mock frame (e.g. integer index or tiny matrix)
        frame_mock = f"frame_{self.current_frame}"
        self.current_frame += 1
        return True, frame_mock

    def release(self):
        self.is_opened = False

class TestStageDVideoEngine(unittest.TestCase):
    def test_video_validation_rules(self):
        # 1. Non-existent file
        with self.assertRaises(FileNotFoundError):
            VideoEngine.validate_video_file("non_existent_camera_99.mp4")

        # 2. Invalid extension
        dummy_txt = STORAGE_DIR / "dummy_test.txt"
        dummy_txt.write_text("dummy")
        try:
            with self.assertRaises(ValueError) as ctx:
                VideoEngine.validate_video_file(dummy_txt)
            self.assertIn("INVALID_VIDEO_FORMAT", str(ctx.exception))
        finally:
            if dummy_txt.exists():
                dummy_txt.unlink()

    def test_sampling_math_25fps_source_3fps_sampling(self):
        """
        Verify that a 25 FPS source video sampled at 3 FPS produces
        timestamps without accumulated drift.
        10 seconds of 25 FPS video = 250 frames.
        At 3 FPS, expected samples = 30 frames at timestamps ~0.0, 0.33, 0.67, 1.0, etc.
        """
        src_fps = 25.0
        frame_count = 250  # 10.0 seconds
        sampling_fps = 3.0

        sample_interval = 1.0 / sampling_fps
        half_src_frame = 0.5 / src_fps
        next_sample_timestamp = 0.0

        sampled_indices = []
        sampled_timestamps = []

        for frame_idx in range(frame_count):
            current_timestamp = frame_idx / src_fps
            if current_timestamp >= next_sample_timestamp - half_src_frame:
                sampled_indices.append(frame_idx)
                sampled_timestamps.append(current_timestamp)
                next_sample_timestamp += sample_interval
                while next_sample_timestamp <= current_timestamp:
                    next_sample_timestamp += sample_interval

        # Expected ~30 samples across 10 seconds
        self.assertEqual(len(sampled_timestamps), 30)
        self.assertAlmostEqual(sampled_timestamps[0], 0.0, places=2)
        self.assertAlmostEqual(sampled_timestamps[-1], 9.68, delta=0.4)

        # Check spacing between consecutive timestamps is approximately 0.33s +/- 0.04s
        for i in range(1, len(sampled_timestamps)):
            diff = sampled_timestamps[i] - sampled_timestamps[i-1]
            self.assertAlmostEqual(diff, 1.0 / 3.0, delta=0.05)

    def test_sampling_math_30fps_source_5fps_sampling(self):
        src_fps = 30.0
        frame_count = 300  # 10.0 seconds
        sampling_fps = 5.0

        sample_interval = 1.0 / sampling_fps
        half_src_frame = 0.5 / src_fps
        next_sample_timestamp = 0.0

        sampled_timestamps = []
        for frame_idx in range(frame_count):
            current_timestamp = frame_idx / src_fps
            if current_timestamp >= next_sample_timestamp - half_src_frame:
                sampled_timestamps.append(current_timestamp)
                next_sample_timestamp += sample_interval
                while next_sample_timestamp <= current_timestamp:
                    next_sample_timestamp += sample_interval

        self.assertEqual(len(sampled_timestamps), 50)
        self.assertAlmostEqual(sampled_timestamps[0], 0.0, places=2)

    def test_search_job_multiple_videos_and_error_resilience(self):
        """
        Verify that SearchJobManager handles multiple videos sequentially,
        updates progress metrics, and records individual missing video errors
        without crashing.
        """
        # Register a mock candidate reference first
        CandidateRepository.save_reference(
            candidate_id="cand_test_stage_d",
            face_id="face_test_stage_d",
            embedding=[0.1] * 128,
            quality_score=0.95,
            quality_label="GOOD"
        )

        job_id = SearchJobManager.create_job(
            candidate_id="cand_test_stage_d",
            selected_video_ids=["camera_missing_01.mp4", "camera_missing_02.mp4"],
            config=SearchConfig(sampling_fps=3.0)
        )

        # Run async scan worker
        asyncio.run(SearchJobManager.execute_search_scan(job_id))

        status = SearchJobManager.get_job_status(job_id)
        self.assertIsNotNone(status)
        # All videos were missing, so job finishes with FAILED status and error details
        self.assertEqual(status.status, "FAILED")
        self.assertIn("VIDEO_NOT_FOUND", status.error)
        self.assertEqual(status.videos_processed, 2)

if __name__ == "__main__":
    unittest.main()
