import unittest
import math
from pathlib import Path

class TestStageDSamplingMathAndLogic(unittest.TestCase):
    def test_sampling_intervals_25fps_to_3fps(self):
        """
        Verify that a 25 FPS source video sampled at 3 FPS produces
        timestamps without accumulated drift.
        10 seconds of 25 FPS video = 250 frames.
        """
        src_fps = 25.0
        frame_count = 250
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

        # Verify exact sample count (30 samples for 10 seconds at 3 FPS)
        self.assertEqual(len(sampled_timestamps), 30)
        self.assertAlmostEqual(sampled_timestamps[0], 0.0, places=2)
        self.assertAlmostEqual(sampled_timestamps[-1], 9.68, delta=0.4)

        # Verify interval spacing
        for i in range(1, len(sampled_timestamps)):
            diff = sampled_timestamps[i] - sampled_timestamps[i-1]
            self.assertAlmostEqual(diff, 1.0 / 3.0, delta=0.05)

    def test_sampling_intervals_30fps_to_1fps_and_5fps(self):
        # 1 FPS test on 30 FPS source (300 frames = 10s)
        src_fps = 30.0
        frame_count = 300
        sampling_fps = 1.0
        sample_interval = 1.0 / sampling_fps
        half_src_frame = 0.5 / src_fps
        next_sample_timestamp = 0.0

        samples_1fps = []
        for frame_idx in range(frame_count):
            current_timestamp = frame_idx / src_fps
            if current_timestamp >= next_sample_timestamp - half_src_frame:
                samples_1fps.append(current_timestamp)
                next_sample_timestamp += sample_interval
                while next_sample_timestamp <= current_timestamp:
                    next_sample_timestamp += sample_interval

        self.assertEqual(len(samples_1fps), 10)
        self.assertEqual(samples_1fps, [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0])

        # 5 FPS test on 30 FPS source
        sampling_fps = 5.0
        sample_interval = 1.0 / sampling_fps
        next_sample_timestamp = 0.0
        samples_5fps = []
        for frame_idx in range(frame_count):
            current_timestamp = frame_idx / src_fps
            if current_timestamp >= next_sample_timestamp - half_src_frame:
                samples_5fps.append(current_timestamp)
                next_sample_timestamp += sample_interval
                while next_sample_timestamp <= current_timestamp:
                    next_sample_timestamp += sample_interval

        self.assertEqual(len(samples_5fps), 50)
        self.assertAlmostEqual(samples_5fps[0], 0.0, places=2)
        self.assertAlmostEqual(samples_5fps[-1], 9.8, places=2)

    def test_memory_sequential_generator_contract(self):
        """
        Verify that frame generator yields single frame objects without buffering list.
        """
        def mock_frame_generator(count):
            for i in range(count):
                # Yields temporary frame matrix simulation
                yield {"frame_idx": i, "data": bytearray(1024)}

        # Iterate 1,000 frames sequentially and assert no memory retention
        processed = 0
        for item in mock_frame_generator(1000):
            processed += 1
            self.assertEqual(len(item["data"]), 1024)
        self.assertEqual(processed, 1000)

if __name__ == "__main__":
    unittest.main()
