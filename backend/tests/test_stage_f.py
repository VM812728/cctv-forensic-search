import unittest
import uuid
from typing import List, Dict, Any

from backend.models.schemas import (
    RawFaceMatch,
    AppearanceEvent,
    SearchResultMatchSchema,
    BoundingBox,
    FacialLandmarks,
    SearchConfig
)
from backend.services.temporal_grouper import TemporalGrouper, temporal_grouper
from backend.services.search_service import SearchJobManager, CandidateRepository


class TestStageFTemporalGroupingIntegration(unittest.TestCase):
    """
    Stage F Integration and Service-Level Verification for Temporal Grouping.
    """

    def setUp(self):
        self.candidate_id = f"cand_test_{uuid.uuid4().hex[:8]}"
        dummy_embedding = [0.0] * 128
        dummy_embedding[0] = 1.0
        CandidateRepository.save_reference(
            candidate_id=self.candidate_id,
            face_id=f"face_{uuid.uuid4().hex[:6]}",
            embedding=dummy_embedding,
            quality_score=0.95,
            quality_label="EXCELLENT",
            candidate_name="Test Candidate"
        )

    def test_search_config_parameters_respected(self):
        """Verify that TemporalGrouper respects custom SearchConfig thresholds."""
        cfg = SearchConfig(
            match_gap_tolerance_seconds=1.5,
            min_event_duration_seconds=2.0,
            match_threshold=0.65,
            high_confidence_threshold=0.80
        )

        raw = [
            RawFaceMatch(
                match_id="m1",
                search_id="s1",
                candidate_id=self.candidate_id,
                video_id="video_01.mp4",
                frame_index=10,
                timestamp_seconds=1.0,
                similarity_score=0.68,
                confidence_band="Medium",
                bounding_box=BoundingBox(x=10, y=10, width=50, height=50)
            ),
            # Gap is 1.2s <= 1.5s tolerance -> grouped into same event
            RawFaceMatch(
                match_id="m2",
                search_id="s1",
                candidate_id=self.candidate_id,
                video_id="video_01.mp4",
                frame_index=22,
                timestamp_seconds=2.2,
                similarity_score=0.82,
                confidence_band="High",
                bounding_box=BoundingBox(x=12, y=10, width=50, height=50)
            ),
            # Gap from 2.2s to 4.0s is 1.8s > 1.5s tolerance -> starts new event
            RawFaceMatch(
                match_id="m3",
                search_id="s1",
                candidate_id=self.candidate_id,
                video_id="video_01.mp4",
                frame_index=40,
                timestamp_seconds=4.0,
                similarity_score=0.75,
                confidence_band="Medium",
                bounding_box=BoundingBox(x=15, y=10, width=50, height=50)
            )
        ]

        events = TemporalGrouper.group_matches(raw, config=cfg)
        self.assertEqual(len(events), 2)

        # Event 1: m1 + m2 (peak score 0.82 >= 0.80 -> High confidence)
        self.assertEqual(events[0].start_time_seconds, 1.0)
        self.assertEqual(events[0].end_time_seconds, 2.2)
        self.assertEqual(events[0].duration_seconds, 1.2)
        self.assertEqual(events[0].peak_similarity, 0.82)
        self.assertEqual(events[0].confidence_band, "High")

        # Event 2: m3 (peak score 0.75 < 0.80 -> Medium confidence)
        self.assertEqual(events[1].start_time_seconds, 4.0)
        self.assertEqual(events[1].end_time_seconds, 4.0)
        self.assertEqual(events[1].duration_seconds, 0.0)
        self.assertEqual(events[1].confidence_band, "Medium")

    def test_appearance_event_to_search_result_match_conversion(self):
        """Verify that AppearanceEvent converts seamlessly to SearchResultMatchSchema."""
        event = AppearanceEvent(
            event_id="ev_12345",
            search_id="search_abc",
            case_id="case_1",
            candidate_id="cand_1",
            reference_id="ref_1",
            video_id="cam_main.mp4",
            camera_name="Main Gate",
            start_time_seconds=12.5,
            end_time_seconds=18.0,
            duration_seconds=5.5,
            peak_similarity=0.885,
            peak_timestamp_seconds=15.0,
            peak_frame_index=450,
            peak_bounding_box=BoundingBox(x=100, y=120, width=64, height=64),
            peak_facial_landmarks=FacialLandmarks(
                right_eye=[110.0, 130.0],
                left_eye=[140.0, 130.0],
                nose_tip=[125.0, 145.0],
                right_mouth_corner=[115.0, 160.0],
                left_mouth_corner=[135.0, 160.0]
            ),
            frame_match_count=12,
            confidence_band="High"
        )

        match_schema = event.to_search_result_match()
        self.assertIsInstance(match_schema, SearchResultMatchSchema)
        self.assertEqual(match_schema.id, "ev_12345")
        self.assertEqual(match_schema.event_start_seconds, 12.5)
        self.assertEqual(match_schema.event_end_seconds, 18.0)
        self.assertEqual(match_schema.peak_timestamp_seconds, 15.0)
        self.assertEqual(match_schema.similarity_score, 0.885)
        self.assertEqual(match_schema.confidence_band, "High")
        self.assertEqual(match_schema.duration_seconds, 5.5)
        self.assertEqual(match_schema.frame_index, 450)
        self.assertEqual(match_schema.frame_match_count, 12)
        self.assertEqual(match_schema.bounding_box.x, 100)

    def test_multiple_faces_distinct_face_indices(self):
        """Verify multiple faces in the same CCTV frame are handled without crash or losing evidence."""
        raw = [
            # Frame at 10.0s has two qualifying faces (candidate + bystander with coincidental high match)
            RawFaceMatch(
                match_id="f10_face0",
                search_id="s1",
                candidate_id=self.candidate_id,
                video_id="cam_01.mp4",
                frame_index=100,
                face_index=0,
                timestamp_seconds=10.0,
                similarity_score=0.88,
                confidence_band="High",
                bounding_box=BoundingBox(x=50, y=50, width=40, height=40)
            ),
            RawFaceMatch(
                match_id="f10_face1",
                search_id="s1",
                candidate_id=self.candidate_id,
                video_id="cam_01.mp4",
                frame_index=100,
                face_index=1,
                timestamp_seconds=10.0,
                similarity_score=0.72,
                confidence_band="Medium",
                bounding_box=BoundingBox(x=300, y=100, width=40, height=40)
            ),
            # Subsequent frame at 11.0s has face 0
            RawFaceMatch(
                match_id="f11_face0",
                search_id="s1",
                candidate_id=self.candidate_id,
                video_id="cam_01.mp4",
                frame_index=110,
                face_index=0,
                timestamp_seconds=11.0,
                similarity_score=0.86,
                confidence_band="High",
                bounding_box=BoundingBox(x=55, y=52, width=40, height=40)
            )
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=2.0)
        # All 3 records within 1.0s gap on same video_id form 1 appearance event with peak 0.88
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev.peak_similarity, 0.88)
        self.assertEqual(ev.frame_match_count, 3)
        self.assertEqual(ev.confidence_band, "High")


if __name__ == "__main__":
    unittest.main()
