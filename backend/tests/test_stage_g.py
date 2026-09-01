import os
import unittest
import subprocess
import shutil
import uuid
import asyncio
from pathlib import Path

from backend.models.schemas import (
    AppearanceEvent,
    BoundingBox,
    FacialLandmarks,
    ClipEvidence,
    ExtractClipRequest,
    ClipEvidenceResponse
)
from backend.services.clip_extractor import ClipExtractor, ClipRepository
from backend.config import TEMP_DIR
from backend.services.storage_manager import (
    VIDEOS_DIR,
    CLIPS_DIR,
    resolve_clip_path
)

from backend.services.search_service import SearchJobManager, CandidateRepository, _SEARCH_JOBS
from backend.services.video_engine import video_engine
from backend.api.clips import (
    extract_clip_endpoint,
    get_clip_metadata,
    stream_clip,
    list_clips
)



class TestStageGClipExtractionIntegration(unittest.TestCase):
    """
    Stage G Integration and API Verification for Automated Evidence Clip Extraction.
    Uses synthetic test MP4 video generated via FFmpeg.
    """

    @classmethod
    def setUpClass(cls):
        cls.ffmpeg_bin = ClipExtractor.get_ffmpeg_binary()

        # Generate a synthetic 10.0-second test video (320x240 @ 25fps) in VIDEOS_DIR
        cls.synth_video_name = f"synth_cctv_test_{uuid.uuid4().hex[:6]}.mp4"
        cls.synth_video_path = VIDEOS_DIR / cls.synth_video_name

        cmd = [
            cls.ffmpeg_bin,
            "-y",
            "-f", "lavfi",
            "-i", "testsrc=duration=10:size=320x240:rate=25",
            "-pix_fmt", "yuv420p",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            str(cls.synth_video_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0 or not cls.synth_video_path.is_file():
            raise RuntimeError(f"Failed to generate synthetic test MP4: {res.stderr.decode('utf-8')}")

    @classmethod
    def tearDownClass(cls):
        if cls.synth_video_path.is_file():
            try:
                cls.synth_video_path.unlink()
            except Exception:
                pass

    def setUp(self):
        ClipRepository.clear()

    # -------------------------------------------------------------
    # 1. FFMPEG INTEGRATION & SYNTHETIC EXTRACTION TESTS
    # -------------------------------------------------------------

    def test_ffmpeg_binary_discovered_and_executable(self):
        """1. FFmpeg binary is located and validated as executable."""
        bin_path = ClipExtractor.get_ffmpeg_binary()
        self.assertTrue(Path(bin_path).is_file())
        self.assertTrue(os.access(bin_path, os.X_OK))

    def test_extract_clip_stream_copy_or_reencode_on_synthetic_video(self):
        """2. Extracts evidence clip from synthetic MP4 video with pre-roll and post-roll."""
        # Event from 3.0s to 6.0s on 10.0s video. Pre-roll: 2.0s (-> 1.0s), Post-roll: 2.0s (-> 8.0s)
        evidence = ClipExtractor.extract_clip(
            source_video=self.synth_video_path,
            event_id="ev_synth_001",
            start_time_seconds=3.0,
            end_time_seconds=6.0,
            peak_timestamp_seconds=4.5,
            peak_similarity=0.88,
            video_id=self.synth_video_name,
            pre_roll_seconds=2.0,
            post_roll_seconds=2.0
        )

        self.assertIsInstance(evidence, ClipEvidence)
        self.assertEqual(evidence.event_id, "ev_synth_001")
        self.assertEqual(evidence.clip_start_seconds, 1.0)
        self.assertEqual(evidence.clip_end_seconds, 8.0)
        self.assertEqual(evidence.duration_seconds, 7.0)
        self.assertEqual(evidence.peak_similarity, 0.88)
        self.assertEqual(evidence.peak_timestamp_seconds, 4.5)
        self.assertIn(evidence.extraction_method, ["stream_copy", "re_encoded"])
        self.assertTrue(len(evidence.sha256) == 64)
        self.assertTrue(evidence.file_size_bytes > 0)

        # Verify generated clip exists on disk
        clip_disk_path = Path(evidence.clip_path)
        self.assertTrue(clip_disk_path.is_file())
        self.assertEqual(clip_disk_path.stat().st_size, evidence.file_size_bytes)

        # Verify SHA-256 matches actual file on disk
        computed_sha = ClipExtractor.compute_sha256(clip_disk_path)
        self.assertEqual(computed_sha, evidence.sha256)

        # Cleanup generated clip
        if clip_disk_path.is_file():
            clip_disk_path.unlink()

    def test_extract_from_appearance_event_schema(self):
        """3. Extracts clip directly from AppearanceEvent schema object."""
        event = AppearanceEvent(
            event_id="ev_schema_test",
            search_id="search_101",
            candidate_id="cand_test",
            video_id=self.synth_video_name,
            start_time_seconds=2.0,
            end_time_seconds=5.0,
            duration_seconds=3.0,
            peak_similarity=0.91,
            peak_timestamp_seconds=3.5,
            peak_bounding_box=BoundingBox(x=10, y=10, width=50, height=50)
        )

        evidence = ClipExtractor.extract_from_event(
            event=event,
            pre_roll_seconds=1.0,
            post_roll_seconds=1.0
        )

        self.assertEqual(evidence.event_id, "ev_schema_test")
        self.assertEqual(evidence.search_id, "search_101")
        self.assertEqual(evidence.clip_start_seconds, 1.0)
        self.assertEqual(evidence.clip_end_seconds, 6.0)
        self.assertEqual(evidence.duration_seconds, 5.0)

        clip_path = Path(evidence.clip_path)
        self.assertTrue(clip_path.is_file())
        clip_path.unlink()

    def test_force_reencode_method_recording(self):
        """4. When force_reencode=True, extraction_method is explicitly recorded as re_encoded."""
        evidence = ClipExtractor.extract_clip(
            source_video=self.synth_video_path,
            event_id="ev_reencode_test",
            start_time_seconds=2.0,
            end_time_seconds=4.0,
            peak_timestamp_seconds=3.0,
            peak_similarity=0.75,
            force_reencode=True
        )

        self.assertEqual(evidence.extraction_method, "re_encoded")
        self.assertTrue(Path(evidence.clip_path).is_file())
        Path(evidence.clip_path).unlink()

    def test_duplicate_clip_extraction_cached(self):
        """5. Re-requesting clip extraction for same event returns cached ClipEvidence without re-running FFmpeg."""
        evidence1 = ClipExtractor.extract_clip(
            source_video=self.synth_video_path,
            event_id="ev_duplicate_test",
            start_time_seconds=1.0,
            end_time_seconds=3.0,
            peak_timestamp_seconds=2.0,
            peak_similarity=0.80
        )

        evidence2 = ClipExtractor.extract_clip(
            source_video=self.synth_video_path,
            event_id="ev_duplicate_test",
            start_time_seconds=1.0,
            end_time_seconds=3.0,
            peak_timestamp_seconds=2.0,
            peak_similarity=0.80
        )

        self.assertEqual(evidence1.clip_id, evidence2.clip_id)
        self.assertEqual(evidence1.sha256, evidence2.sha256)
        self.assertEqual(evidence1.clip_path, evidence2.clip_path)

        if Path(evidence1.clip_path).is_file():
            Path(evidence1.clip_path).unlink()

    def test_error_handling_source_video_not_found(self):
        """6. Raises FileNotFoundError (VIDEO_NOT_FOUND) when source CCTV video does not exist."""
        with self.assertRaises(FileNotFoundError) as ctx:
            ClipExtractor.extract_clip(
                source_video="non_existent_cctv_camera.mp4",
                event_id="ev_missing",
                start_time_seconds=1.0,
                end_time_seconds=5.0,
                peak_timestamp_seconds=3.0,
                peak_similarity=0.70
            )
        self.assertIn("VIDEO_NOT_FOUND", str(ctx.exception))

    def test_error_handling_unsupported_format(self):
        """7. Raises ValueError (INVALID_VIDEO_FORMAT) for unsupported file extension."""
        dummy_bad = VIDEOS_DIR / "dummy_script.sh"
        dummy_bad.write_text("#!/bin/bash\necho hello\n")
        try:
            with self.assertRaises(ValueError) as ctx:
                ClipExtractor.extract_clip(
                    source_video=dummy_bad,
                    event_id="ev_bad_ext",
                    start_time_seconds=1.0,
                    end_time_seconds=5.0,
                    peak_timestamp_seconds=3.0,
                    peak_similarity=0.70
                )
            self.assertIn("INVALID_VIDEO_FORMAT", str(ctx.exception))
        finally:
            if dummy_bad.is_file():
                dummy_bad.unlink()

    # -------------------------------------------------------------
    # 2. ENDPOINT DIRECT INVOCATION & SERVICE INTEGRATION TESTS
    # -------------------------------------------------------------

    def test_api_extract_clip_endpoint(self):
        """8. POST /clips/extract extracts clip and returns structured ClipEvidenceResponse."""
        req = ExtractClipRequest(
            event_id="ev_api_test_01",
            video_id=self.synth_video_name,
            start_time_seconds=2.0,
            end_time_seconds=5.0,
            peak_timestamp_seconds=3.5,
            peak_similarity=0.85,
            pre_roll_seconds=1.0,
            post_roll_seconds=1.0,
            camera_name="Entrance Cam"
        )

        response = asyncio.run(extract_clip_endpoint(req))
        self.assertEqual(response.status, "SUCCESS")
        clip = response.clip
        self.assertEqual(clip.event_id, "ev_api_test_01")
        self.assertEqual(clip.camera_name, "Entrance Cam")
        self.assertEqual(clip.clip_start_seconds, 1.0)
        self.assertEqual(clip.clip_end_seconds, 6.0)
        self.assertEqual(clip.duration_seconds, 5.0)
        self.assertTrue(len(clip.sha256) == 64)

        clip_id = clip.clip_id

        # Test GET /clips/{clip_id}
        meta_clip = asyncio.run(get_clip_metadata(clip_id))
        self.assertEqual(meta_clip.clip_id, clip_id)
        self.assertEqual(meta_clip.sha256, clip.sha256)

        # Test GET /clips/{clip_id}/stream
        file_resp = asyncio.run(stream_clip(clip_id))
        self.assertEqual(file_resp.media_type, "video/mp4")
        self.assertTrue(Path(file_resp.path).is_file())

        # Cleanup
        clip_path = Path(clip.clip_path)
        if clip_path.is_file():
            clip_path.unlink()

    def test_api_get_nonexistent_clip_404(self):
        """9. GET /clips/{clip_id} returns 404 CLIP_NOT_FOUND for non-existent clip ID."""
        try:
            from fastapi import HTTPException
        except ImportError:
            from backend.api.clips import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_clip_metadata("clip_nonexistent_999999"))
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("CLIP_NOT_FOUND", str(ctx.exception.detail))

    def test_api_extract_clip_updates_search_job_match(self):
        """10. POST /clips/extract updates SearchJob result clip_generated and clip_id."""
        # Create a search job with a match
        cand_id = f"cand_test_{uuid.uuid4().hex[:6]}"
        CandidateRepository.save_reference(
            candidate_id=cand_id,
            face_id=f"face_{uuid.uuid4().hex[:6]}",
            embedding=[0.0] * 128,
            quality_score=0.95,
            quality_label="GOOD"
        )
        search_id = SearchJobManager.create_job(
            candidate_id=cand_id,
            selected_video_ids=[self.synth_video_name]
        )

        event_id = "ev_search_match_001"
        # Seed dummy result match in search job
        job_dict = _SEARCH_JOBS[search_id]
        job_dict["results"] = [

            {
                "id": event_id,
                "search_id": search_id,
                "candidate_id": cand_id,
                "video_id": self.synth_video_name,
                "camera_name": "Test Cam",
                "event_start_seconds": 2.0,
                "event_end_seconds": 4.0,
                "peak_timestamp_seconds": 3.0,
                "similarity_score": 0.82,
                "confidence_band": "High",
                "bounding_box": {"x": 10, "y": 10, "width": 40, "height": 40},
                "duration_seconds": 2.0,
                "clip_generated": False,
                "clip_id": None
            }
        ]

        req = ExtractClipRequest(
            event_id=event_id,
            search_id=search_id,
            video_id=self.synth_video_name,
            pre_roll_seconds=1.0,
            post_roll_seconds=1.0
        )

        response = asyncio.run(extract_clip_endpoint(req))
        self.assertEqual(response.status, "SUCCESS")
        generated_clip_id = response.clip.clip_id

        # Check updated search results
        job_status = SearchJobManager.get_job_status(search_id)
        self.assertEqual(len(job_status.results), 1)
        self.assertTrue(job_status.results[0].clip_generated)
        self.assertEqual(job_status.results[0].clip_id, generated_clip_id)

        # Cleanup
        clip_path = Path(response.clip.clip_path)
        if clip_path.is_file():
            clip_path.unlink()


if __name__ == "__main__":
    unittest.main()
