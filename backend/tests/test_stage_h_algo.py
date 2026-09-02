import unittest
from backend.services.verification_engine import (
    VerificationEngine,
    STATUS_VERIFIED,
    STATUS_REJECTED,
    STATUS_INCONCLUSIVE,
    STATUS_UNVERIFIED
)
from backend.models.schemas import (
    AppearanceEvent,
    RawFaceMatch,
    BoundingBox,
    FacialLandmarks,
    LandmarkPoint,
    SearchConfig
)


class TestStageHVerificationWindow(unittest.TestCase):
    def test_window_calculation_standard(self):
        # Event [10.0, 15.0] in a 60s video with 3s padding
        win_start, win_end, duration = VerificationEngine.calculate_verification_window(
            start_time_seconds=10.0,
            end_time_seconds=15.0,
            video_duration_seconds=60.0,
            padding_seconds=3.0
        )
        self.assertEqual(win_start, 7.0)
        self.assertEqual(win_end, 18.0)
        self.assertEqual(duration, 11.0)

    def test_window_calculation_clamped_at_start(self):
        # Event [1.0, 4.0] in a 60s video with 3s padding -> start must clamp to 0.0
        win_start, win_end, duration = VerificationEngine.calculate_verification_window(
            start_time_seconds=1.0,
            end_time_seconds=4.0,
            video_duration_seconds=60.0,
            padding_seconds=3.0
        )
        self.assertEqual(win_start, 0.0)
        self.assertEqual(win_end, 7.0)
        self.assertEqual(duration, 7.0)

    def test_window_calculation_clamped_at_end(self):
        # Event [55.0, 58.0] in a 60s video with 5s padding -> end must clamp to 60.0
        win_start, win_end, duration = VerificationEngine.calculate_verification_window(
            start_time_seconds=55.0,
            end_time_seconds=58.0,
            video_duration_seconds=60.0,
            padding_seconds=5.0
        )
        self.assertEqual(win_start, 50.0)
        self.assertEqual(win_end, 60.0)
        self.assertEqual(duration, 10.0)

    def test_window_calculation_zero_padding(self):
        win_start, win_end, duration = VerificationEngine.calculate_verification_window(
            start_time_seconds=12.5,
            end_time_seconds=14.5,
            video_duration_seconds=100.0,
            padding_seconds=0.0
        )
        self.assertEqual(win_start, 12.5)
        self.assertEqual(win_end, 14.5)
        self.assertEqual(duration, 2.0)

    def test_window_calculation_negative_timestamp_raises(self):
        with self.assertRaises(ValueError):
            VerificationEngine.calculate_verification_window(
                start_time_seconds=-1.0,
                end_time_seconds=10.0,
                video_duration_seconds=60.0
            )

    def test_window_calculation_invalid_range_raises(self):
        with self.assertRaises(ValueError):
            VerificationEngine.calculate_verification_window(
                start_time_seconds=20.0,
                end_time_seconds=10.0,
                video_duration_seconds=60.0
            )


class TestStageHForensicTraceability(unittest.TestCase):
    def test_pass1_and_pass2_forensic_fields(self):
        event = AppearanceEvent(
            event_id="ev_test_100",
            search_id="search_abc",
            candidate_id="cand_1",
            video_id="cam_entry_01.mp4",
            camera_name="Entrance Cam",
            start_time_seconds=10.0,
            end_time_seconds=12.0,
            duration_seconds=2.0,
            peak_similarity=0.72,
            peak_timestamp_seconds=11.0,
            peak_bounding_box=BoundingBox(x=10, y=10, width=50, height=50),
            confidence_band="Medium",
            verification_status=STATUS_UNVERIFIED
        )

        match_schema = event.to_search_result_match()
        self.assertEqual(match_schema.id, "ev_test_100")
        self.assertEqual(match_schema.verification_status, STATUS_UNVERIFIED)
        self.assertEqual(match_schema.event_start_seconds, 10.0)
        self.assertEqual(match_schema.event_end_seconds, 12.0)

    def test_refined_event_preserves_pass1_history(self):
        refined = AppearanceEvent(
            event_id="ev_test_100",
            search_id="search_abc",
            candidate_id="cand_1",
            video_id="cam_entry_01.mp4",
            start_time_seconds=9.8,
            end_time_seconds=12.4,
            duration_seconds=2.6,
            peak_similarity=0.88,
            peak_timestamp_seconds=11.2,
            peak_bounding_box=BoundingBox(x=12, y=12, width=54, height=54),
            confidence_band="High",
            verification_status=STATUS_VERIFIED,
            pass1_event_id="ev_test_100",
            pass1_start_time=10.0,
            pass1_end_time=12.0,
            pass1_peak_similarity=0.72,
            verification_match_count=8,
            verification_sampling_fps=10.0,
            verification_peak_similarity=0.88
        )

        res = refined.to_search_result_match()
        self.assertEqual(res.verification_status, STATUS_VERIFIED)
        self.assertEqual(res.pass1_start_time, 10.0)
        self.assertEqual(res.pass1_end_time, 12.0)
        self.assertEqual(res.pass1_peak_similarity, 0.72)
        self.assertEqual(res.event_start_seconds, 9.8)
        self.assertEqual(res.event_end_seconds, 12.4)
        self.assertEqual(res.similarity_score, 0.88)
        self.assertEqual(res.verification_match_count, 8)


class TestStageHMultiCameraIsolation(unittest.TestCase):
    def test_multi_camera_events_remain_strictly_isolated(self):
        events = [
            AppearanceEvent(
                event_id="ev_cam2_01",
                search_id="s1",
                candidate_id="c1",
                video_id="cam_02.mp4",
                start_time_seconds=5.0,
                end_time_seconds=7.0,
                duration_seconds=2.0,
                peak_similarity=0.70,
                peak_timestamp_seconds=6.0,
                peak_bounding_box=BoundingBox(x=5, y=5, width=40, height=40)
            ),
            AppearanceEvent(
                event_id="ev_cam1_01",
                search_id="s1",
                candidate_id="c1",
                video_id="cam_01.mp4",
                start_time_seconds=2.0,
                end_time_seconds=4.0,
                duration_seconds=2.0,
                peak_similarity=0.75,
                peak_timestamp_seconds=3.0,
                peak_bounding_box=BoundingBox(x=10, y=10, width=50, height=50)
            )
        ]

        def dummy_resolver(vid):
            return None  # Will mark as unresolved / inconclusive

        refined_events, pass2_matches, telem = VerificationEngine.verify_appearance_events(
            events=events,
            video_path_resolver=dummy_resolver,
            candidate_embedding=[0.1] * 128
        )

        self.assertEqual(len(refined_events), 2)
        # Deterministic sort check: cam_01 before cam_02
        self.assertEqual(refined_events[0].video_id, "cam_01.mp4")
        self.assertEqual(refined_events[1].video_id, "cam_02.mp4")
        self.assertEqual(refined_events[0].verification_status, STATUS_INCONCLUSIVE)
        self.assertEqual(refined_events[1].verification_status, STATUS_INCONCLUSIVE)


if __name__ == "__main__":
    unittest.main()
