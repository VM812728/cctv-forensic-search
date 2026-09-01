import unittest
import math
import asyncio
from backend.services.matching_engine import MatchingEngine, EmbeddingValidationError
from backend.models.schemas import (
    SearchConfig,
    BoundingBox,
    FacialLandmarks,
    LandmarkPoint,
    RawFaceMatch,
    SearchResultMatchSchema
)
from backend.services.search_service import SearchJobManager, CandidateRepository

class TestStageESimilarityAndMatching(unittest.TestCase):
    def setUp(self):
        self.engine = MatchingEngine

    def test_cosine_similarity_properties(self):
        # 1. Self similarity = 1.0
        vec = [1.0 / math.sqrt(128)] * 128
        self.assertAlmostEqual(self.engine.cosine_similarity(vec, vec), 1.0, places=6)

        # 2. Orthogonal vectors = 0.0
        vec_a = [0.0] * 128
        vec_b = [0.0] * 128
        for i in range(64):
            vec_a[i] = 1.0 / math.sqrt(64)
        for i in range(64, 128):
            vec_b[i] = 1.0 / math.sqrt(64)
        self.assertAlmostEqual(self.engine.cosine_similarity(vec_a, vec_b), 0.0, places=6)

        # 3. Opposite vectors = -1.0
        vec_opp = [-1.0 / math.sqrt(128)] * 128
        self.assertAlmostEqual(self.engine.cosine_similarity(vec, vec_opp), -1.0, places=6)

        # 4. Known vector pair
        v1 = [0.0] * 128
        v2 = [0.0] * 128
        v1[0] = 0.6
        v1[1] = 0.8
        v2[0] = 0.8
        v2[1] = 0.6
        self.assertAlmostEqual(self.engine.cosine_similarity(v1, v2), 0.96, places=6)

    def test_embedding_validation_failures(self):
        valid_vec = [1.0 / math.sqrt(128)] * 128

        # Dimension mismatch
        with self.assertRaises(EmbeddingValidationError):
            self.engine.validate_embedding([0.1] * 127)

        # Zero vector
        with self.assertRaises(EmbeddingValidationError):
            self.engine.validate_embedding([0.0] * 128)

        # NaN
        nan_vec = list(valid_vec)
        nan_vec[0] = float('nan')
        with self.assertRaises(EmbeddingValidationError):
            self.engine.validate_embedding(nan_vec)

        # Inf
        inf_vec = list(valid_vec)
        inf_vec[1] = float('inf')
        with self.assertRaises(EmbeddingValidationError):
            self.engine.validate_embedding(inf_vec)

        # Non-numeric
        str_vec = list(valid_vec)
        str_vec[2] = "invalid_string"
        with self.assertRaises(EmbeddingValidationError):
            self.engine.validate_embedding(str_vec)

    def test_thresholds_and_confidence_classification(self):
        # Default config thresholds: 0.60, 0.75
        self.assertEqual(self.engine.classify_confidence(0.50, 0.60, 0.75), "NO_MATCH")
        self.assertEqual(self.engine.classify_confidence(0.60, 0.60, 0.75), "Medium")
        self.assertEqual(self.engine.classify_confidence(0.70, 0.60, 0.75), "Medium")
        self.assertEqual(self.engine.classify_confidence(0.75, 0.60, 0.75), "High")
        self.assertEqual(self.engine.classify_confidence(0.95, 0.60, 0.75), "High")

        # Custom config thresholds: 0.50, 0.80
        self.assertEqual(self.engine.classify_confidence(0.49, 0.50, 0.80), "NO_MATCH")
        self.assertEqual(self.engine.classify_confidence(0.50, 0.50, 0.80), "Medium")
        self.assertEqual(self.engine.classify_confidence(0.79, 0.50, 0.80), "Medium")
        self.assertEqual(self.engine.classify_confidence(0.80, 0.50, 0.80), "High")

    def test_multi_face_frame_matching_and_metadata_preservation(self):
        # Candidate vector: [1, 0, 0, ...]
        cand_emb = [1.0] + [0.0] * 127

        # Face A: orthogonal -> similarity = 0.0 -> NO_MATCH
        face_a = [0.0, 1.0] + [0.0] * 126

        # Face B: similarity = 0.68 -> Medium
        sin_angle = math.sqrt(1.0 - 0.68 * 0.68)
        face_b = [0.68, sin_angle] + [0.0] * 126

        # Face C: identical -> similarity = 1.0 -> High
        face_c = list(cand_emb)

        detected_faces = [
            {"face_id": "face_a", "embedding": face_a, "bounding_box": {"x": 10, "y": 10, "width": 50, "height": 50}},
            {"face_id": "face_b", "embedding": face_b, "bounding_box": {"x": 120, "y": 80, "width": 60, "height": 60}},
            {"face_id": "face_c", "embedding": face_c, "bounding_box": {"x": 300, "y": 150, "width": 80, "height": 80}}
        ]

        matches = self.engine.match_frame_faces(
            candidate_embedding=cand_emb,
            detected_faces=detected_faces,
            search_id="search_multi_test",
            candidate_id="cand_stage_e_test",
            video_id="CAM_NORTH.mp4",
            frame_index=42,
            timestamp_seconds=14.0,
            match_threshold=0.60,
            high_confidence_threshold=0.75
        )

        # Expected 2 matches: Face B and Face C
        self.assertEqual(len(matches), 2)
        self.assertEqual(matches[0].reference_id, "face_b")
        self.assertEqual(matches[0].confidence_band, "Medium")
        self.assertAlmostEqual(matches[0].similarity_score, 0.68, places=4)
        self.assertEqual(matches[0].frame_index, 42)
        self.assertEqual(matches[0].timestamp_seconds, 14.0)

        self.assertEqual(matches[1].reference_id, "face_c")
        self.assertEqual(matches[1].confidence_band, "High")
        self.assertAlmostEqual(matches[1].similarity_score, 1.0, places=4)
        self.assertEqual(matches[1].bounding_box.x, 300)

    def test_search_job_manager_integration(self):
        # 1. Register candidate reference
        cand_emb = [1.0 / math.sqrt(128)] * 128
        CandidateRepository.save_reference(
            candidate_id="cand_e2e_001",
            face_id="face_e2e_001",
            embedding=cand_emb,
            quality_score=0.98,
            quality_label="EXCELLENT",
            candidate_name="Jane Doe"
        )

        # 2. Create search job
        job_id = SearchJobManager.create_job(
            candidate_id="cand_e2e_001",
            selected_video_ids=["camera_hall_01.mp4"],
            config=SearchConfig(match_threshold=0.60, high_confidence_threshold=0.75)
        )

        # 3. Verify initial status
        status = SearchJobManager.get_job_status(job_id)
        self.assertEqual(status.status, "QUEUED")
        self.assertEqual(status.candidate_id, "cand_e2e_001")
        self.assertEqual(status.potential_matches, 0)
        self.assertEqual(status.verified_matches, 0)

        # 4. Verify raw matches access
        raw_matches = SearchJobManager.get_raw_matches(job_id)
        self.assertEqual(len(raw_matches), 0)

if __name__ == "__main__":
    unittest.main()
