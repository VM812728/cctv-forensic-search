import unittest
import math

class EmbeddingValidationError(ValueError):
    pass

class StandaloneMatchingEngine:
    EXPECTED_DIMENSION = 128

    @classmethod
    def validate_embedding(cls, embedding, name="Embedding"):
        if embedding is None:
            raise EmbeddingValidationError(f"{name} is None.")
        try:
            emb_list = [float(x) for x in embedding]
        except (ValueError, TypeError) as e:
            raise EmbeddingValidationError(f"{name} contains non-numeric values: {str(e)}")

        if len(emb_list) != cls.EXPECTED_DIMENSION:
            raise EmbeddingValidationError(
                f"{name} dimension mismatch: expected {cls.EXPECTED_DIMENSION}, got {len(emb_list)}."
            )

        for idx, val in enumerate(emb_list):
            if math.isnan(val) or math.isinf(val):
                raise EmbeddingValidationError(f"{name} contains non-finite value at index {idx}: {val}")

        norm_sq = sum(x * x for x in emb_list)
        norm = math.sqrt(norm_sq)

        if norm < 1e-6:
            raise EmbeddingValidationError(f"{name} is a zero vector (norm={norm}).")

        if not (0.85 <= norm <= 1.15):
            raise EmbeddingValidationError(f"{name} is not unit-normalized (norm={norm:.4f}).")

        return emb_list

    @classmethod
    def compute_cosine_similarity(cls, candidate_embedding, face_embedding):
        cand_vec = cls.validate_embedding(candidate_embedding, "Candidate embedding")
        face_vec = cls.validate_embedding(face_embedding, "Face embedding")

        dot_product = 0.0
        norm_a_sq = 0.0
        norm_b_sq = 0.0

        for a, b in zip(cand_vec, face_vec):
            dot_product += a * b
            norm_a_sq += a * a
            norm_b_sq += b * b

        denom = math.sqrt(norm_a_sq) * math.sqrt(norm_b_sq)
        if denom < 1e-12:
            return 0.0

        raw_similarity = dot_product / denom
        if raw_similarity > 1.0:
            return 1.0
        elif raw_similarity < -1.0:
            return -1.0
        return raw_similarity

    @classmethod
    def classify_confidence(cls, similarity, match_threshold=0.60, high_confidence_threshold=0.75):
        if similarity < match_threshold:
            return "NO_MATCH"
        elif similarity >= high_confidence_threshold:
            return "HIGH"
        else:
            return "MEDIUM"

    @classmethod
    def match_frame_faces(
        cls,
        candidate_embedding,
        detected_faces,
        search_id,
        candidate_id,
        video_id,
        frame_index,
        timestamp_seconds,
        match_threshold=0.60,
        high_confidence_threshold=0.75
    ):
        matches = []
        if not detected_faces:
            return matches

        cand_vec = cls.validate_embedding(candidate_embedding, "Candidate embedding")

        for face_idx, face_data in enumerate(detected_faces):
            face_emb = face_data.get("embedding")
            if not face_emb:
                continue

            try:
                sim = cls.compute_cosine_similarity(cand_vec, face_emb)
            except EmbeddingValidationError:
                continue

            if sim >= match_threshold:
                conf = cls.classify_confidence(sim, match_threshold, high_confidence_threshold)
                bbox = face_data.get("bounding_box", {})
                match_record = {
                    "match_id": f"match_mock_{face_idx}",
                    "search_id": search_id,
                    "candidate_id": candidate_id,
                    "video_id": video_id,
                    "frame_index": frame_index,
                    "timestamp_seconds": timestamp_seconds,
                    "similarity_score": sim,
                    "confidence_band": conf,
                    "bounding_box": bbox,
                    "face_index": face_idx,
                    "landmarks": face_data.get("landmarks"),
                    "detection_confidence": face_data.get("detection_confidence", 0.0)
                }
                matches.append(match_record)

        return matches

class TestStageEMatchingMathAndAlgorithm(unittest.TestCase):
    def setUp(self):
        # Base unit vector [1, 0, 0, ...] of dimension 128
        self.v_x = [1.0] + [0.0] * 127
        # Orthogonal unit vector [0, 1, 0, ...] of dimension 128
        self.v_y = [0.0, 1.0] + [0.0] * 126
        # Opposite unit vector [-1, 0, 0, ...] of dimension 128
        self.v_neg_x = [-1.0] + [0.0] * 127

    # 1. Similarity tests
    def test_identical_normalized_vectors(self):
        sim = StandaloneMatchingEngine.compute_cosine_similarity(self.v_x, self.v_x)
        self.assertAlmostEqual(sim, 1.0, places=5)

    def test_orthogonal_vectors(self):
        sim = StandaloneMatchingEngine.compute_cosine_similarity(self.v_x, self.v_y)
        self.assertAlmostEqual(sim, 0.0, places=5)

    def test_opposite_vectors(self):
        sim = StandaloneMatchingEngine.compute_cosine_similarity(self.v_x, self.v_neg_x)
        self.assertAlmostEqual(sim, -1.0, places=5)

    def test_known_vector_pair_cosine_similarity(self):
        # 45-degree angle in first two dimensions: (1, 0) and (1/sqrt(2), 1/sqrt(2))
        cos_45 = 1.0 / math.sqrt(2.0)
        v_45 = [cos_45, cos_45] + [0.0] * 126
        sim = StandaloneMatchingEngine.compute_cosine_similarity(self.v_x, v_45)
        self.assertAlmostEqual(sim, cos_45, places=5)

    # 2. Validation tests
    def test_dimension_mismatch_error(self):
        short_vec = [1.0] * 64
        with self.assertRaises(EmbeddingValidationError) as ctx:
            StandaloneMatchingEngine.validate_embedding(short_vec, "Short embedding")
        self.assertIn("dimension mismatch", str(ctx.exception).lower())

    def test_zero_vector_error(self):
        zero_vec = [0.0] * 128
        with self.assertRaises(EmbeddingValidationError) as ctx:
            StandaloneMatchingEngine.validate_embedding(zero_vec, "Zero embedding")
        self.assertIn("zero vector", str(ctx.exception).lower())

    def test_nan_vector_error(self):
        nan_vec = [float('nan')] + [0.0] * 127
        with self.assertRaises(EmbeddingValidationError) as ctx:
            StandaloneMatchingEngine.validate_embedding(nan_vec, "NaN embedding")
        self.assertIn("non-finite", str(ctx.exception).lower())

    def test_infinity_vector_error(self):
        inf_vec = [float('inf')] + [0.0] * 127
        with self.assertRaises(EmbeddingValidationError) as ctx:
            StandaloneMatchingEngine.validate_embedding(inf_vec, "Inf embedding")
        self.assertIn("non-finite", str(ctx.exception).lower())

    def test_non_normalized_vector_error(self):
        unnorm_vec = [10.0] * 128
        with self.assertRaises(EmbeddingValidationError) as ctx:
            StandaloneMatchingEngine.validate_embedding(unnorm_vec, "Unnormalized embedding")
        self.assertIn("not unit-normalized", str(ctx.exception).lower())

    # 3. Threshold and Confidence Band tests
    def test_confidence_classification(self):
        # match_threshold = 0.60, high_confidence_threshold = 0.75
        self.assertEqual(StandaloneMatchingEngine.classify_confidence(0.40, 0.60, 0.75), "NO_MATCH")
        self.assertEqual(StandaloneMatchingEngine.classify_confidence(0.599, 0.60, 0.75), "NO_MATCH")
        self.assertEqual(StandaloneMatchingEngine.classify_confidence(0.60, 0.60, 0.75), "MEDIUM")
        self.assertEqual(StandaloneMatchingEngine.classify_confidence(0.70, 0.60, 0.75), "MEDIUM")
        self.assertEqual(StandaloneMatchingEngine.classify_confidence(0.75, 0.60, 0.75), "HIGH")
        self.assertEqual(StandaloneMatchingEngine.classify_confidence(0.92, 0.60, 0.75), "HIGH")

    # 4. Multiple Faces in One Frame tests
    def test_multiple_faces_comparison_and_preservation(self):
        cos_45 = 1.0 / math.sqrt(2.0)
        v_45 = [cos_45, cos_45] + [0.0] * 126

        detected_faces = [
            {
                "face_id": "face_0",
                "embedding": self.v_y,
                "bounding_box": {"x": 10, "y": 10, "width": 50, "height": 50},
                "detection_confidence": 0.90
            },
            {
                "face_id": "face_1",
                "embedding": v_45,
                "bounding_box": {"x": 100, "y": 20, "width": 60, "height": 60},
                "detection_confidence": 0.95
            },
            {
                "face_id": "face_2",
                "embedding": self.v_x,
                "bounding_box": {"x": 300, "y": 40, "width": 55, "height": 55},
                "detection_confidence": 0.99
            },
            {
                "face_id": "face_3",
                "embedding": self.v_neg_x,
                "bounding_box": {"x": 500, "y": 80, "width": 45, "height": 45},
                "detection_confidence": 0.85
            }
        ]

        matches = StandaloneMatchingEngine.match_frame_faces(
            candidate_embedding=self.v_x,
            detected_faces=detected_faces,
            search_id="search_test_123",
            candidate_id="cand_123",
            video_id="CAM_ENTRANCE_01.mp4",
            frame_index=42,
            timestamp_seconds=14.0,
            match_threshold=0.60,
            high_confidence_threshold=0.75
        )

        # Expected 2 matches: Face 1 and Face 2
        self.assertEqual(len(matches), 2)
        
        # Verify Face 1 match details
        self.assertEqual(matches[0]["face_index"], 1)
        self.assertAlmostEqual(matches[0]["similarity_score"], cos_45, places=4)
        self.assertEqual(matches[0]["confidence_band"], "MEDIUM")
        self.assertEqual(matches[0]["frame_index"], 42)
        self.assertEqual(matches[0]["timestamp_seconds"], 14.0)
        self.assertEqual(matches[0]["video_id"], "CAM_ENTRANCE_01.mp4")
        self.assertEqual(matches[0]["bounding_box"]["x"], 100)

        # Verify Face 2 match details
        self.assertEqual(matches[1]["face_index"], 2)
        self.assertAlmostEqual(matches[1]["similarity_score"], 1.0, places=4)
        self.assertEqual(matches[1]["confidence_band"], "HIGH")
        self.assertEqual(matches[1]["bounding_box"]["x"], 300)

    # 5. Metadata preservation test
    def test_landmarks_and_metadata_preservation(self):
        landmarks = {
            "right_eye": {"x": 105.0, "y": 30.0},
            "left_eye": {"x": 125.0, "y": 30.0},
            "nose": {"x": 115.0, "y": 42.0},
            "right_mouth_corner": {"x": 108.0, "y": 55.0},
            "left_mouth_corner": {"x": 122.0, "y": 55.0}
        }
        detected_faces = [{
            "face_id": "face_meta_test",
            "embedding": self.v_x,
            "bounding_box": {"x": 100, "y": 20, "width": 60, "height": 60},
            "landmarks": landmarks,
            "detection_confidence": 0.98
        }]

        matches = StandaloneMatchingEngine.match_frame_faces(
            candidate_embedding=self.v_x,
            detected_faces=detected_faces,
            search_id="search_meta_123",
            candidate_id="cand_meta_123",
            video_id="CAM_HALLWAY.mp4",
            frame_index=150,
            timestamp_seconds=5.0,
            match_threshold=0.60
        )

        self.assertEqual(len(matches), 1)
        m = matches[0]
        self.assertEqual(m["video_id"], "CAM_HALLWAY.mp4")
        self.assertEqual(m["frame_index"], 150)
        self.assertEqual(m["timestamp_seconds"], 5.0)
        self.assertEqual(m["bounding_box"]["width"], 60)
        self.assertIsNotNone(m["landmarks"])
        self.assertAlmostEqual(m["landmarks"]["nose"]["x"], 115.0)
        self.assertAlmostEqual(m["landmarks"]["nose"]["y"], 42.0)

if __name__ == "__main__":
    unittest.main()
