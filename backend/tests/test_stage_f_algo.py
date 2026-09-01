import unittest
import math
from typing import List

from backend.models.schemas import RawFaceMatch, BoundingBox, FacialLandmarks, SearchConfig
from backend.services.temporal_grouper import TemporalGrouper, temporal_grouper


class TestStageFTemporalGroupingAlgorithms(unittest.TestCase):
    """
    Stage F Algorithmic and Mathematical Verification of Temporal Match Grouping.
    """

    def _create_match(
        self,
        video_id: str = "CAM_01.mp4",
        timestamp_seconds: float = 0.0,
        similarity_score: float = 0.70,
        frame_index: int = 0,
        face_index: int = 0,
        match_id: str = "m1",
        search_id: str = "search_001",
        candidate_id: str = "cand_001",
        confidence_band: str = "Medium",
        bbox_x: int = 100,
        bbox_y: int = 100,
        landmarks: bool = True
    ) -> RawFaceMatch:
        lm = None
        if landmarks:
            lm = FacialLandmarks(
                right_eye=[110.0, 110.0],
                left_eye=[130.0, 110.0],
                nose_tip=[120.0, 125.0],
                right_mouth_corner=[112.0, 140.0],
                left_mouth_corner=[128.0, 140.0]
            )

        return RawFaceMatch(
            match_id=match_id,
            search_id=search_id,
            case_id="case_abc",
            candidate_id=candidate_id,
            reference_id="ref_001",
            video_id=video_id,
            camera_name=f"Camera {video_id}",
            frame_index=frame_index,
            timestamp_seconds=timestamp_seconds,
            similarity_score=similarity_score,
            confidence_band=confidence_band,
            bounding_box=BoundingBox(x=bbox_x, y=bbox_y, width=50, height=50),
            facial_landmarks=lm,
            face_index=face_index,
            detection_confidence=0.98
        )

    def test_basic_grouping_consecutive_within_tolerance(self):
        """1. Consecutive matches within tolerance group into exactly one appearance event."""
        # Timestamps: 10.0, 11.0, 12.5, 14.0, 16.5 (gaps: 1.0, 1.5, 1.5, 2.5 <= 3.0)
        raw = [
            self._create_match(timestamp_seconds=10.0, similarity_score=0.71, frame_index=100, match_id="m1"),
            self._create_match(timestamp_seconds=11.0, similarity_score=0.68, frame_index=110, match_id="m2"),
            self._create_match(timestamp_seconds=12.5, similarity_score=0.74, frame_index=125, match_id="m3"),
            self._create_match(timestamp_seconds=14.0, similarity_score=0.79, frame_index=140, match_id="m4"),
            self._create_match(timestamp_seconds=16.5, similarity_score=0.73, frame_index=165, match_id="m5"),
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=3.0)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev.start_time_seconds, 10.0)
        self.assertEqual(ev.end_time_seconds, 16.5)
        self.assertEqual(ev.duration_seconds, 6.5)
        self.assertEqual(ev.frame_match_count, 5)
        self.assertEqual(ev.peak_similarity, 0.79)
        self.assertEqual(ev.peak_timestamp_seconds, 14.0)
        self.assertEqual(ev.peak_frame_index, 140)

    def test_grouping_gap_beyond_tolerance_splits_events(self):
        """2. Gap exceeding match_gap_tolerance_seconds splits into separate events."""
        # Matches: 10.0, 11.0, 12.0 (gap 1.0) -> Gap to 20.0 is 8.0s (> 3.0s) -> 20.0, 21.0
        raw = [
            self._create_match(timestamp_seconds=10.0, similarity_score=0.70, frame_index=10, match_id="m1"),
            self._create_match(timestamp_seconds=11.0, similarity_score=0.75, frame_index=11, match_id="m2"),
            self._create_match(timestamp_seconds=12.0, similarity_score=0.72, frame_index=12, match_id="m3"),
            self._create_match(timestamp_seconds=20.0, similarity_score=0.88, frame_index=20, match_id="m4"),
            self._create_match(timestamp_seconds=21.0, similarity_score=0.85, frame_index=21, match_id="m5"),
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=3.0)
        self.assertEqual(len(events), 2)

        ev1, ev2 = events[0], events[1]
        self.assertEqual(ev1.start_time_seconds, 10.0)
        self.assertEqual(ev1.end_time_seconds, 12.0)
        self.assertEqual(ev1.duration_seconds, 2.0)
        self.assertEqual(ev1.frame_match_count, 3)
        self.assertEqual(ev1.peak_similarity, 0.75)
        self.assertEqual(ev1.confidence_band, "High")  # 0.75 >= 0.75

        self.assertEqual(ev2.start_time_seconds, 20.0)
        self.assertEqual(ev2.end_time_seconds, 21.0)
        self.assertEqual(ev2.duration_seconds, 1.0)
        self.assertEqual(ev2.frame_match_count, 2)
        self.assertEqual(ev2.peak_similarity, 0.88)
        self.assertEqual(ev2.confidence_band, "High")

    def test_video_isolation_never_merges_different_cameras(self):
        """3. Matches from different cameras/videos NEVER merge into one event even at same timestamp."""
        raw = [
            self._create_match(video_id="CAM_01.mp4", timestamp_seconds=10.0, similarity_score=0.80, match_id="c1_m1"),
            self._create_match(video_id="CAM_02.mp4", timestamp_seconds=10.001, similarity_score=0.82, match_id="c2_m1"),
            self._create_match(video_id="CAM_01.mp4", timestamp_seconds=11.0, similarity_score=0.81, match_id="c1_m2"),
            self._create_match(video_id="CAM_02.mp4", timestamp_seconds=11.5, similarity_score=0.79, match_id="c2_m2"),
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=3.0)
        self.assertEqual(len(events), 2)
        video_ids = [e.video_id for e in events]
        self.assertIn("CAM_01.mp4", video_ids)
        self.assertIn("CAM_02.mp4", video_ids)
        self.assertNotEqual(events[0].video_id, events[1].video_id)

    def test_unordered_input_sorting(self):
        """4. Chronologically disordered raw matches are sorted correctly before clustering."""
        raw = [
            self._create_match(timestamp_seconds=15.0, similarity_score=0.70, frame_index=150, match_id="m3"),
            self._create_match(timestamp_seconds=5.0, similarity_score=0.75, frame_index=50, match_id="m1"),
            self._create_match(timestamp_seconds=10.0, similarity_score=0.85, frame_index=100, match_id="m2"),
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=6.0)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev.start_time_seconds, 5.0)
        self.assertEqual(ev.end_time_seconds, 15.0)
        self.assertEqual(ev.duration_seconds, 10.0)
        self.assertEqual(ev.peak_similarity, 0.85)
        self.assertEqual(ev.peak_timestamp_seconds, 10.0)
        self.assertEqual(ev.peak_frame_index, 100)

    def test_peak_selection_and_deterministic_tie_breaking(self):
        """5. Highest score is selected; on exact score tie, earliest timestamp is selected deterministically."""
        raw = [
            self._create_match(timestamp_seconds=1.0, similarity_score=0.82, frame_index=10, bbox_x=100, match_id="m1"),
            self._create_match(timestamp_seconds=2.0, similarity_score=0.82, frame_index=20, bbox_x=200, match_id="m2"),
            self._create_match(timestamp_seconds=3.0, similarity_score=0.80, frame_index=30, bbox_x=300, match_id="m3"),
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=2.0)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev.peak_similarity, 0.82)
        # Must pick earliest timestamp (1.0)
        self.assertEqual(ev.peak_timestamp_seconds, 1.0)
        self.assertEqual(ev.peak_frame_index, 10)
        self.assertEqual(ev.peak_bounding_box.x, 100)

    def test_minimum_event_duration_filtering(self):
        """6. Single frame matches have duration=0.0; optional min_duration filter functions correctly."""
        raw = [
            # Event 1: Single frame at 5.0 (duration 0.0)
            self._create_match(timestamp_seconds=5.0, similarity_score=0.75, match_id="m1"),
            # Event 2: Multiple frames from 20.0 to 22.5 (duration 2.5)
            self._create_match(timestamp_seconds=20.0, similarity_score=0.72, match_id="m2"),
            self._create_match(timestamp_seconds=22.5, similarity_score=0.78, match_id="m3"),
        ]

        # Default behavior: preserve all events so single-frame high-quality evidence is NOT lost
        events_all = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=3.0, filter_min_duration=False)
        self.assertEqual(len(events_all), 2)
        self.assertEqual(events_all[0].duration_seconds, 0.0)
        self.assertEqual(events_all[1].duration_seconds, 2.5)

        # When filtered with min_event_duration_seconds=1.0:
        events_filtered = TemporalGrouper.group_matches(
            raw,
            match_gap_tolerance_seconds=3.0,
            min_event_duration_seconds=1.0,
            filter_min_duration=True
        )
        self.assertEqual(len(events_filtered), 1)
        self.assertEqual(events_filtered[0].start_time_seconds, 20.0)
        self.assertEqual(events_filtered[0].duration_seconds, 2.5)

    def test_metadata_and_landmarks_preservation(self):
        """7. Search, Candidate, Case, Bounding Box, and Facial Landmarks are preserved in AppearanceEvent."""
        raw = [
            self._create_match(
                search_id="search_xyz",
                candidate_id="cand_456",
                timestamp_seconds=42.0,
                similarity_score=0.88,
                frame_index=1260,
                bbox_x=250,
                bbox_y=180,
                landmarks=True,
                match_id="m_landmark"
            )
        ]

        events = TemporalGrouper.group_matches(raw)
        self.assertEqual(len(events), 1)
        ev = events[0]
        self.assertEqual(ev.search_id, "search_xyz")
        self.assertEqual(ev.candidate_id, "cand_456")
        self.assertEqual(ev.case_id, "case_abc")
        self.assertEqual(ev.peak_bounding_box.x, 250)
        self.assertEqual(ev.peak_bounding_box.y, 180)
        self.assertIsNotNone(ev.peak_facial_landmarks)
        self.assertEqual(ev.peak_facial_landmarks.nose_tip, [120.0, 125.0])

    def test_duplicate_same_frame_detections_deduplicated(self):
        """8. Exact same-frame/face duplicate records are deduplicated keeping highest similarity."""
        raw = [
            self._create_match(timestamp_seconds=10.0, frame_index=100, face_index=0, similarity_score=0.72, match_id="m1"),
            self._create_match(timestamp_seconds=10.0, frame_index=100, face_index=0, similarity_score=0.80, match_id="m1_dup"),
            self._create_match(timestamp_seconds=11.0, frame_index=110, face_index=0, similarity_score=0.74, match_id="m2"),
        ]

        events = TemporalGrouper.group_matches(raw, match_gap_tolerance_seconds=2.0)
        self.assertEqual(len(events), 1)
        ev = events[0]
        # Should count 2 distinct frames (10.0 and 11.0), not 3
        self.assertEqual(ev.frame_match_count, 2)
        self.assertEqual(ev.peak_similarity, 0.80)

    def test_edge_cases_empty_single_large_gap(self):
        """9. Edge cases: empty list, single match, large timestamp gaps."""
        # Empty input
        self.assertEqual(TemporalGrouper.group_matches([]), [])

        # Single match
        single = [self._create_match(timestamp_seconds=100.0, similarity_score=0.85, match_id="s1")]
        single_events = TemporalGrouper.group_matches(single)
        self.assertEqual(len(single_events), 1)
        self.assertEqual(single_events[0].start_time_seconds, 100.0)
        self.assertEqual(single_events[0].end_time_seconds, 100.0)
        self.assertEqual(single_events[0].duration_seconds, 0.0)
        self.assertEqual(single_events[0].frame_match_count, 1)

        # Large gaps (e.g. 1000s between detections)
        sparse = [
            self._create_match(timestamp_seconds=0.0, similarity_score=0.70, match_id="sp1"),
            self._create_match(timestamp_seconds=1000.0, similarity_score=0.70, match_id="sp2"),
            self._create_match(timestamp_seconds=2000.0, similarity_score=0.70, match_id="sp3"),
        ]
        sparse_events = TemporalGrouper.group_matches(sparse, match_gap_tolerance_seconds=5.0)
        self.assertEqual(len(sparse_events), 3)


if __name__ == "__main__":
    unittest.main()
