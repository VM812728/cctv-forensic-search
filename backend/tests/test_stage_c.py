import unittest
import math
try:
    from pydantic import ValidationError
except ImportError:
    class ValidationError(Exception):
        pass

from backend.models.schemas import (
    CandidateReference,
    SearchConfig,
    StartSearchRequest,
    StartSearchResponse,
    SearchStatusResponse,
    SearchResultMatchSchema,
    BoundingBox,
    FacialLandmarks,
    LandmarkPoint
)
from backend.services.search_service import CandidateRepository, SearchJobManager
from backend.services.storage_manager import sanitize_filename, get_safe_path, STORAGE_DIR

class TestStageCModelsAndServices(unittest.TestCase):
    def setUp(self):
        # Clear mock records
        pass

    def test_schemas_validation(self):
        # 1. Test BoundingBox & Landmarks
        bbox = BoundingBox(x=10, y=20, width=100, height=120)
        self.assertEqual(bbox.x, 10)
        self.assertEqual(bbox.height, 120)

        landmarks = FacialLandmarks(
            right_eye=LandmarkPoint(x=30.0, y=40.0),
            left_eye=LandmarkPoint(x=70.0, y=40.0),
            nose=LandmarkPoint(x=50.0, y=60.0),
            right_mouth_corner=LandmarkPoint(x=35.0, y=90.0),
            left_mouth_corner=LandmarkPoint(x=65.0, y=90.0)
        )
        self.assertEqual(landmarks.nose.x, 50.0)

        # 2. Test SearchConfig defaults
        cfg = SearchConfig()
        self.assertEqual(cfg.sampling_fps, 3.0)
        self.assertEqual(cfg.match_threshold, 0.60)
        self.assertEqual(cfg.high_confidence_threshold, 0.75)
        self.assertEqual(cfg.pre_roll_seconds, 5.0)

    def test_candidate_repository(self):
        # Mock 128-d normalized embedding vector
        mock_embedding = [0.1] * 128
        norm = sum(x**2 for x in mock_embedding) ** 0.5
        normed = [x / norm for x in mock_embedding]

        ref = CandidateRepository.save_reference(
            candidate_id="cand_test_001",
            face_id="face_abc123",
            embedding=normed,
            quality_score=0.92,
            quality_label="GOOD",
            roll_number="ROLL-2026-99",
            candidate_name="John Doe"
        )
        self.assertEqual(ref.candidate_id, "cand_test_001")
        self.assertEqual(ref.face_id, "face_abc123")
        self.assertEqual(ref.embedding_dimension, 128)
        self.assertTrue(ref.embedding_available)

        # Verify raw embedding retrieval (internal only)
        retrieved_emb = CandidateRepository.get_embedding("cand_test_001")
        self.assertIsNotNone(retrieved_emb)
        self.assertEqual(len(retrieved_emb), 128)

        # Verify reference lookup without exposing embedding
        fetched_ref = CandidateRepository.get_reference("cand_test_001")
        self.assertIsNotNone(fetched_ref)
        self.assertEqual(fetched_ref.candidate_name, "John Doe")
        self.assertFalse(hasattr(fetched_ref, "embedding")) # Embedding not in CandidateReference schema

    def test_search_job_lifecycle(self):
        job_id = SearchJobManager.create_job(
            candidate_id="cand_test_001",
            selected_video_ids=["camera_01.mp4", "camera_02.mp4"],
            config=SearchConfig(sampling_fps=2.0),
            case_id="case_101"
        )
        self.assertTrue(job_id.startswith("search_"))

        status = SearchJobManager.get_job_status(job_id)
        self.assertIsNotNone(status)
        self.assertEqual(status.status, "QUEUED")
        self.assertEqual(status.videos_total, 2)
        self.assertEqual(status.progress_percent, 0.0)
        self.assertEqual(status.frames_processed, 0)
        self.assertEqual(status.potential_matches, 0)

        # Update state
        SearchJobManager.update_job_status(
            job_id,
            status="RUNNING",
            progress_percent=45.0,
            frames_processed=1200,
            faces_detected=340
        )
        updated_status = SearchJobManager.get_job_status(job_id)
        self.assertEqual(updated_status.status, "RUNNING")
        self.assertEqual(updated_status.progress_percent, 45.0)
        self.assertEqual(updated_status.frames_processed, 1200)

    def test_storage_sanitization_and_security(self):
        # Test path traversal prevention
        unsafe_name = "../../etc/passwd"
        clean = sanitize_filename(unsafe_name)
        self.assertNotIn("..", clean)
        self.assertNotIn("/", clean)
        self.assertNotIn("\\", clean)

        # Test safe path resolution
        safe_path = get_safe_path(STORAGE_DIR, "thumbnails/test.jpg")
        self.assertTrue(str(safe_path).startswith(str(STORAGE_DIR.resolve())))

        with self.assertRaises(ValueError):
            get_safe_path(STORAGE_DIR, "../outside.txt")

if __name__ == "__main__":
    unittest.main()

