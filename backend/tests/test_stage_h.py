import os
import shutil
import tempfile
import unittest
import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

from backend.models.schemas import (
    AppearanceEvent,
    RawFaceMatch,
    BoundingBox,
    FacialLandmarks,
    LandmarkPoint,
    SearchConfig
)
from backend.services.verification_engine import (
    VerificationEngine,
    STATUS_VERIFIED,
    STATUS_REJECTED,
    STATUS_INCONCLUSIVE,
    STATUS_UNVERIFIED
)
from backend.services.video_engine import VideoEngine, VideoMetadata, SampledFrame
from backend.services.face_engine import DetectedFace
from backend.services.matching_engine import MatchingEngine
from backend.services.search_service import SearchJobManager, CandidateRepository


class TestStageHIntegration(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.workspace = Path(self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_sample_frames_in_window_simulation(self):
        vid_path = self.workspace / "test_window.mp4"
        vid_path.touch()

        # Mock metadata
        mock_meta = VideoMetadata(
            video_id="test_window.mp4",
            file_path=str(vid_path),
            fps=25.0,
            frame_count=250,
            duration_seconds=10.0,
            width=640,
            height=480,
            codec="h264",
            file_size_bytes=1000
        )

        dummy_frames = [
            SampledFrame(frame=MagicMock(), timestamp_seconds=1.0 + i * 0.1, frame_index=25 + i, source_video_id="test_window.mp4")
            for i in range(20)
        ]

        with patch.object(VideoEngine, "get_video_metadata", return_value=mock_meta), \
             patch.object(VideoEngine, "sample_frames_in_window", return_value=iter(dummy_frames)):

            sampled = list(VideoEngine.sample_frames_in_window(
                file_path=vid_path,
                start_time_seconds=1.0,
                end_time_seconds=3.0,
                sampling_fps=10.0
            ))

            self.assertEqual(len(sampled), 20)
            self.assertEqual(sampled[0].timestamp_seconds, 1.0)
            self.assertAlmostEqual(sampled[-1].timestamp_seconds, 2.9, places=5)

    def test_verify_single_event_verified(self):
        vid_path = self.workspace / "test_verified.mp4"
        vid_path.touch()

        emb = [1.0] + [0.0] * 127

        mock_fe = MagicMock()
        mock_fe.biometric_engine_ready = True
        mock_face = DetectedFace(
            face_id="f_pass2_1",
            bounding_box=BoundingBox(x=10, y=10, width=50, height=50),
            embedding=emb,
            quality_score=0.90,
            quality_label="GOOD"
        )
        mock_fe.detect_and_extract_face_features.return_value = [mock_face]

        mock_ve = MagicMock()
        mock_ve.get_video_metadata.return_value = VideoMetadata(
            video_id="test_verified.mp4",
            file_path=str(vid_path),
            fps=25.0,
            frame_count=250,
            duration_seconds=10.0,
            width=640,
            height=480,
            codec="h264",
            file_size_bytes=1000
        )
        mock_ve.sample_frames_in_window.return_value = iter([
            SampledFrame(frame=MagicMock(), timestamp_seconds=1.2, frame_index=30, source_video_id="test_verified.mp4"),
            SampledFrame(frame=MagicMock(), timestamp_seconds=1.4, frame_index=35, source_video_id="test_verified.mp4"),
            SampledFrame(frame=MagicMock(), timestamp_seconds=1.6, frame_index=40, source_video_id="test_verified.mp4"),
        ])

        initial_event = AppearanceEvent(
            event_id="ev_pass1_01",
            search_id="search_test_1",
            candidate_id="cand_real",
            video_id="test_verified.mp4",
            camera_name="Cam A",
            start_time_seconds=1.0,
            end_time_seconds=2.0,
            duration_seconds=1.0,
            peak_similarity=0.72,
            peak_timestamp_seconds=1.5,
            peak_bounding_box=BoundingBox(x=10, y=10, width=50, height=50)
        )

        config = SearchConfig(
            verification_enabled=True,
            verification_padding_seconds=0.5,
            verification_sampling_fps=10.0,
            match_threshold=0.60
        )

        refined_event, pass2_matches, telem = VerificationEngine.verify_single_event(
            event=initial_event,
            video_path=vid_path,
            candidate_embedding=emb,
            config=config,
            face_engine_instance=mock_fe,
            video_engine_instance=mock_ve
        )

        self.assertEqual(refined_event.verification_status, STATUS_VERIFIED)
        self.assertEqual(len(pass2_matches), 3)
        self.assertEqual(refined_event.pass1_start_time, 1.0)
        self.assertEqual(refined_event.pass1_end_time, 2.0)
        self.assertEqual(refined_event.pass1_peak_similarity, 0.72)
        self.assertAlmostEqual(refined_event.peak_similarity, 1.0, places=5)
        self.assertEqual(refined_event.verification_match_count, 3)
        self.assertEqual(telem["decision"], STATUS_VERIFIED)

    def test_verify_single_event_rejected(self):
        vid_path = self.workspace / "test_rejected.mp4"
        vid_path.touch()

        emb = [1.0] + [0.0] * 127

        mock_fe = MagicMock()
        mock_fe.biometric_engine_ready = True
        mock_fe.detect_and_extract_face_features.return_value = []

        mock_ve = MagicMock()
        mock_ve.get_video_metadata.return_value = VideoMetadata(
            video_id="test_rejected.mp4",
            file_path=str(vid_path),
            fps=25.0,
            frame_count=250,
            duration_seconds=10.0,
            width=640,
            height=480,
            codec="h264",
            file_size_bytes=1000
        )
        mock_ve.sample_frames_in_window.return_value = iter([
            SampledFrame(frame=MagicMock(), timestamp_seconds=1.2, frame_index=30, source_video_id="test_rejected.mp4"),
            SampledFrame(frame=MagicMock(), timestamp_seconds=1.5, frame_index=37, source_video_id="test_rejected.mp4"),
        ])

        initial_event = AppearanceEvent(
            event_id="ev_pass1_02",
            search_id="search_test_2",
            candidate_id="cand_real",
            video_id="test_rejected.mp4",
            start_time_seconds=1.0,
            end_time_seconds=2.0,
            duration_seconds=1.0,
            peak_similarity=0.70,
            peak_timestamp_seconds=1.5,
            peak_bounding_box=BoundingBox(x=10, y=10, width=50, height=50)
        )

        refined_event, pass2_matches, telem = VerificationEngine.verify_single_event(
            event=initial_event,
            video_path=vid_path,
            candidate_embedding=emb,
            config=SearchConfig(verification_enabled=True),
            face_engine_instance=mock_fe,
            video_engine_instance=mock_ve
        )

        self.assertEqual(refined_event.verification_status, STATUS_REJECTED)
        self.assertEqual(len(pass2_matches), 0)
        self.assertEqual(refined_event.pass1_peak_similarity, 0.70)
        self.assertEqual(telem["decision"], STATUS_REJECTED)

    def test_search_scan_two_pass_workflow(self):
        emb = [1.0] + [0.0] * 127
        CandidateRepository.save_reference(
            candidate_id="cand_test_e2e",
            face_id="f_test_e2e",
            embedding=emb,
            quality_score=0.92,
            quality_label="GOOD"
        )

        vid_path = self.workspace / "cam_e2e.mp4"
        vid_path.touch()

        mock_face = DetectedFace(
            face_id="f_cam_e2e",
            bounding_box=BoundingBox(x=20, y=20, width=60, height=60),
            embedding=emb,
            quality_score=0.95,
            quality_label="GOOD"
        )

        meta = VideoMetadata(
            video_id="cam_e2e.mp4",
            file_path=str(vid_path),
            fps=25.0,
            frame_count=125,
            duration_seconds=5.0,
            width=640,
            height=480,
            codec="h264",
            file_size_bytes=1000
        )

        def get_pass1_frames(*args, **kwargs):
            return iter([
                SampledFrame(frame=MagicMock(), timestamp_seconds=1.0, frame_index=25, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=1.5, frame_index=37, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=2.0, frame_index=50, source_video_id="cam_e2e.mp4")
            ])

        def get_pass2_frames(*args, **kwargs):
            return iter([
                SampledFrame(frame=MagicMock(), timestamp_seconds=0.8, frame_index=20, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=1.0, frame_index=25, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=1.2, frame_index=30, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=1.5, frame_index=37, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=1.8, frame_index=45, source_video_id="cam_e2e.mp4"),
                SampledFrame(frame=MagicMock(), timestamp_seconds=2.0, frame_index=50, source_video_id="cam_e2e.mp4")
            ])

        with patch("backend.services.search_service.resolve_video_path", return_value=vid_path), \
             patch("backend.services.search_service.video_engine.get_video_metadata", return_value=meta), \
             patch("backend.services.search_service.video_engine.sample_frames", side_effect=get_pass1_frames), \
             patch("backend.services.verification_engine.video_engine.get_video_metadata", return_value=meta), \
             patch("backend.services.verification_engine.video_engine.sample_frames_in_window", side_effect=get_pass2_frames), \
             patch("backend.services.search_service.face_engine") as mock_fe, \
             patch("backend.services.verification_engine.face_engine") as mock_fe_verif:

            mock_fe.biometric_engine_ready = True
            mock_fe.detect_and_extract_face_features.return_value = [mock_face]
            mock_fe_verif.biometric_engine_ready = True
            mock_fe_verif.detect_and_extract_face_features.return_value = [mock_face]

            # 1. Test with Stage H Enabled
            search_id = SearchJobManager.create_job(
                candidate_id="cand_test_e2e",
                selected_video_ids=["cam_e2e.mp4"],
                config=SearchConfig(
                    sampling_fps=2.0,
                    verification_enabled=True,
                    verification_sampling_fps=10.0
                )
            )

            asyncio.run(SearchJobManager.execute_search_scan(search_id))
            status = SearchJobManager.get_job_status(search_id)

            self.assertEqual(status.status, "COMPLETED")
            self.assertEqual(status.current_phase, "COMPLETED")
            self.assertEqual(status.verification_status, "COMPLETED")
            self.assertGreater(len(status.results), 0)
            self.assertEqual(status.results[0].verification_status, STATUS_VERIFIED)
            self.assertGreater(len(status.pass2_matches), 0)
            self.assertAlmostEqual(status.results[0].similarity_score, 1.0, places=5)

            # 2. Test with Stage H Disabled
            search_id_disabled = SearchJobManager.create_job(
                candidate_id="cand_test_e2e",
                selected_video_ids=["cam_e2e.mp4"],
                config=SearchConfig(
                    sampling_fps=2.0,
                    verification_enabled=False
                )
            )

            asyncio.run(SearchJobManager.execute_search_scan(search_id_disabled))
            status_disabled = SearchJobManager.get_job_status(search_id_disabled)

            self.assertEqual(status_disabled.status, "COMPLETED")
            self.assertEqual(status_disabled.verification_status, "DISABLED")
            self.assertGreater(len(status_disabled.results), 0)
            self.assertEqual(status_disabled.results[0].verification_status, STATUS_UNVERIFIED)
            self.assertEqual(len(status_disabled.pass2_matches), 0)


if __name__ == "__main__":
    unittest.main()
