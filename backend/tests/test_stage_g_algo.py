import os
import unittest
import tempfile
import hashlib
from pathlib import Path

from backend.services.clip_extractor import ClipExtractor, ClipRepository
from backend.models.schemas import ClipEvidence
from backend.services.storage_manager import (
    sanitize_filename,
    get_safe_path,
    STORAGE_DIR,
    CLIPS_DIR,
    ALLOWED_VIDEO_EXTENSIONS
)


class TestStageGClipExtractionAlgorithms(unittest.TestCase):
    """
    Stage G Algorithmic, Mathematical, Security, and Integrity Tests.
    """

    def setUp(self):
        ClipRepository.clear()

    # -------------------------------------------------------------
    # 1. TIME WINDOW MATHEMATICAL BOUNDING TESTS
    # -------------------------------------------------------------

    def test_pre_roll_and_post_roll_standard_calculation(self):
        """1. Standard window calculation: adds pre-roll and post-roll correctly within bounds."""
        # Video: 100.0s duration, Event: 20.0s -> 30.0s, Pre-roll: 5.0s, Post-roll: 5.0s
        start, end, dur = ClipExtractor.calculate_clip_window(
            start_time_seconds=20.0,
            end_time_seconds=30.0,
            video_duration_seconds=100.0,
            pre_roll_seconds=5.0,
            post_roll_seconds=5.0
        )
        self.assertEqual(start, 15.0)
        self.assertEqual(end, 35.0)
        self.assertEqual(dur, 20.0)

    def test_start_time_clamped_to_zero(self):
        """2. Clip start time is clamped to 0.0 when (start_time - pre_roll) < 0."""
        # Video: 60.0s duration, Event: 2.5s -> 10.0s, Pre-roll: 5.0s (2.5 - 5.0 = -2.5 -> 0.0)
        start, end, dur = ClipExtractor.calculate_clip_window(
            start_time_seconds=2.5,
            end_time_seconds=10.0,
            video_duration_seconds=60.0,
            pre_roll_seconds=5.0,
            post_roll_seconds=4.0
        )
        self.assertEqual(start, 0.0)
        self.assertEqual(end, 14.0)
        self.assertEqual(dur, 14.0)

    def test_end_time_clamped_to_source_video_duration(self):
        """3. Clip end time is clamped to video_duration when (end_time + post_roll) > duration."""
        # Video: 50.0s duration, Event: 40.0s -> 48.0s, Pre-roll: 5.0s, Post-roll: 5.0s (48 + 5 = 53 -> 50.0)
        start, end, dur = ClipExtractor.calculate_clip_window(
            start_time_seconds=40.0,
            end_time_seconds=48.0,
            video_duration_seconds=50.0,
            pre_roll_seconds=5.0,
            post_roll_seconds=5.0
        )
        self.assertEqual(start, 35.0)
        self.assertEqual(end, 50.0)
        self.assertEqual(dur, 15.0)

    def test_both_boundaries_clamped_short_video(self):
        """4. Both boundaries clamped when video is shorter than pre-roll + event + post-roll."""
        # Video: 8.0s duration, Event: 2.0s -> 6.0s, Pre-roll: 5.0s, Post-roll: 5.0s
        start, end, dur = ClipExtractor.calculate_clip_window(
            start_time_seconds=2.0,
            end_time_seconds=6.0,
            video_duration_seconds=8.0,
            pre_roll_seconds=5.0,
            post_roll_seconds=5.0
        )
        self.assertEqual(start, 0.0)
        self.assertEqual(end, 8.0)
        self.assertEqual(dur, 8.0)

    def test_single_frame_event_duration(self):
        """5. Single-frame event (start == end) produces window of exactly pre_roll + post_roll."""
        # Video: 100.0s duration, Event: 50.0s -> 50.0s, Pre-roll: 3.0s, Post-roll: 4.0s
        start, end, dur = ClipExtractor.calculate_clip_window(
            start_time_seconds=50.0,
            end_time_seconds=50.0,
            video_duration_seconds=100.0,
            pre_roll_seconds=3.0,
            post_roll_seconds=4.0
        )
        self.assertEqual(start, 47.0)
        self.assertEqual(end, 54.0)
        self.assertEqual(dur, 7.0)

    def test_negative_event_timestamps_rejected(self):
        """6. Negative event start or end timestamps raise explicit INVALID_CLIP_WINDOW."""
        with self.assertRaises(ValueError) as ctx:
            ClipExtractor.calculate_clip_window(
                start_time_seconds=-5.0,
                end_time_seconds=10.0,
                video_duration_seconds=50.0
            )
        self.assertIn("INVALID_CLIP_WINDOW", str(ctx.exception))

    def test_inverted_event_window_rejected(self):
        """7. Inverted event window (end_time < start_time) raises INVALID_CLIP_WINDOW."""
        with self.assertRaises(ValueError) as ctx:
            ClipExtractor.calculate_clip_window(
                start_time_seconds=30.0,
                end_time_seconds=20.0,
                video_duration_seconds=50.0
            )
        self.assertIn("INVALID_CLIP_WINDOW", str(ctx.exception))

    def test_zero_duration_clip_window_rejected(self):
        """8. Event at or beyond video boundary where clip_end <= clip_start is rejected."""
        with self.assertRaises(ValueError) as ctx:
            ClipExtractor.calculate_clip_window(
                start_time_seconds=50.0,
                end_time_seconds=50.0,
                video_duration_seconds=50.0,
                pre_roll_seconds=0.0,
                post_roll_seconds=0.0
            )
        self.assertIn("INVALID_CLIP_WINDOW", str(ctx.exception))

    # -------------------------------------------------------------
    # 2. SHA-256 INTEGRITY & BIT-LEVEL ACCURACY TESTS
    # -------------------------------------------------------------

    def test_sha256_hash_computation(self):
        """9. SHA-256 produces exact 64-char hexadecimal digest representing file bytes."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf:
            tf.write(b"SAMPLE_FORENSIC_VIDEO_BYTES_EVIDENCE_12345")
            tf.flush()
            temp_path = tf.name

        try:
            expected_hash = hashlib.sha256(b"SAMPLE_FORENSIC_VIDEO_BYTES_EVIDENCE_12345").hexdigest()
            computed_hash = ClipExtractor.compute_sha256(temp_path)
            self.assertEqual(len(computed_hash), 64)
            self.assertEqual(computed_hash, expected_hash)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_sha256_hash_changes_with_any_byte_alteration(self):
        """10. Any byte change in evidence file produces completely different SHA-256 hash."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf1, \
             tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf2:
            tf1.write(b"SAMPLE_EVIDENCE_ORIGINAL")
            tf2.write(b"SAMPLE_EVIDENCE_TAMPERED")
            tf1.flush()
            tf2.flush()
            p1, p2 = tf1.name, tf2.name

        try:
            hash1 = ClipExtractor.compute_sha256(p1)
            hash2 = ClipExtractor.compute_sha256(p2)
            self.assertNotEqual(hash1, hash2)
        finally:
            for p in (p1, p2):
                if os.path.exists(p):
                    os.remove(p)

    # -------------------------------------------------------------
    # 3. SECURITY & STORAGE BOUNDARY TESTS
    # -------------------------------------------------------------

    def test_sanitize_filename_prevents_traversal(self):
        """11. sanitize_filename strips directory traversal characters."""
        self.assertEqual(sanitize_filename("../../etc/passwd"), "passwd")
        self.assertEqual(sanitize_filename("..\\..\\windows\\system32"), "system32")
        self.assertEqual(sanitize_filename("camera_01/../../secret.mp4"), "secret.mp4")
        self.assertTrue(sanitize_filename("camera_01.mp4").endswith(".mp4"))

    def test_get_safe_path_boundary_enforcement(self):
        """12. get_safe_path raises ValueError on path traversal attempts outside base_dir."""
        with self.assertRaises(ValueError) as ctx:
            get_safe_path(STORAGE_DIR, "../../../etc/shadow")
        self.assertIn("Path traversal attempted", str(ctx.exception))

    def test_allowed_video_extensions_whitelist(self):
        """13. Allowed video extensions include standard containers and reject dangerous extensions."""
        self.assertIn(".mp4", ALLOWED_VIDEO_EXTENSIONS)
        self.assertIn(".mkv", ALLOWED_VIDEO_EXTENSIONS)
        self.assertIn(".avi", ALLOWED_VIDEO_EXTENSIONS)
        self.assertNotIn(".exe", ALLOWED_VIDEO_EXTENSIONS)
        self.assertNotIn(".sh", ALLOWED_VIDEO_EXTENSIONS)
        self.assertNotIn(".py", ALLOWED_VIDEO_EXTENSIONS)
        self.assertNotIn(".txt", ALLOWED_VIDEO_EXTENSIONS)

    # -------------------------------------------------------------
    # 4. DUPLICATE REGISTRY & METADATA PRESERVATION
    # -------------------------------------------------------------

    def test_clip_repository_indexing_and_lookup(self):
        """14. ClipRepository indexes and retrieves ClipEvidence by clip_id and (search_id, event_id)."""
        evidence = ClipEvidence(
            clip_id="clip_test123",
            event_id="ev_001",
            search_id="search_abc",
            case_id="case_xyz",
            candidate_id="cand_1",
            reference_id="ref_1",
            video_id="cam1.mp4",
            camera_name="Camera 1",
            source_video_filename="cam1.mp4",
            output_filename="clip_test123.mp4",
            clip_path="/storage/clips/clip_test123.mp4",
            clip_start_seconds=10.0,
            clip_end_seconds=20.0,
            duration_seconds=10.0,
            peak_timestamp_seconds=15.0,
            peak_similarity=0.88,
            sha256="a" * 64,
            file_size_bytes=1024,
            mime_type="video/mp4",
            extraction_method="stream_copy",
            created_at="2026-09-01T12:00:00Z"
        )

        ClipRepository.register_clip(evidence)

        # Lookup by clip_id
        retrieved_by_id = ClipRepository.get_clip("clip_test123")
        self.assertIsNotNone(retrieved_by_id)
        self.assertEqual(retrieved_by_id.event_id, "ev_001")
        self.assertEqual(retrieved_by_id.peak_similarity, 0.88)

        # Lookup by event_id with search_id
        retrieved_by_event = ClipRepository.get_clip_by_event("ev_001", search_id="search_abc")
        self.assertIsNotNone(retrieved_by_event)
        self.assertEqual(retrieved_by_event.clip_id, "clip_test123")

        # Lookup by event_id alone
        retrieved_by_event_alone = ClipRepository.get_clip_by_event("ev_001")
        self.assertIsNotNone(retrieved_by_event_alone)
        self.assertEqual(retrieved_by_event_alone.clip_id, "clip_test123")


if __name__ == "__main__":
    unittest.main()
