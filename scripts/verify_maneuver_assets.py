from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v2"
EXPECTED = {
    "dix-hallpike-posterior": (4, 5, [700, 700, 1800, 800, 700]),
    "epley-posterior": (7, 6, [700, 700, 1800, 1800, 1800, 1800]),
    "gufoni-horizontal-geotropic": (4, 4, [700, 1800, 1800, 900]),
    "gufoni-horizontal-apogeotropic": (4, 4, [700, 1800, 1800, 900]),
}


def verify() -> None:
    for maneuver, (keyframe_count, gif_frame_count, durations) in EXPECTED.items():
        right_dir = ASSET_ROOT / maneuver / "right" / "frames"
        left_dir = ASSET_ROOT / maneuver / "left" / "frames"
        right_paths = sorted(right_dir.glob("frame-*.png"))
        left_paths = sorted(left_dir.glob("frame-*.png"))
        assert len(right_paths) == keyframe_count, (maneuver, len(right_paths))
        assert len(left_paths) == keyframe_count, (maneuver, len(left_paths))

        size = None
        for right_path, left_path in zip(right_paths, left_paths):
            right = Image.open(right_path).convert("RGBA")
            left = Image.open(left_path).convert("RGBA")
            assert right.getchannel("A").getextrema() == (0, 255), right_path
            assert left.getchannel("A").getextrema() == (0, 255), left_path
            size = size or right.size
            assert right.size == size == left.size
            expected_left = np.asarray(right.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
            assert np.array_equal(expected_left, np.asarray(left)), left_path

        for side in ("right", "left"):
            gif_path = ASSET_ROOT / maneuver / side / f"{maneuver}-{side}.gif"
            gif = Image.open(gif_path)
            loop = gif.info.get("loop")
            transparency = gif.info.get("transparency")
            actual_durations = []
            actual_sizes = []
            for index in range(gif.n_frames):
                gif.seek(index)
                actual_durations.append(gif.info.get("duration"))
                actual_sizes.append(gif.size)
            assert gif.n_frames == gif_frame_count, gif_path
            assert actual_durations == durations, (gif_path, actual_durations)
            assert loop == 0, gif_path
            assert transparency == 0, gif_path
            assert all(actual_size == size for actual_size in actual_sizes), gif_path
            gif.seek(0)
            assert gif.convert("RGBA").getchannel("A").getextrema()[0] == 0, gif_path

    print("PASS: all maneuver assets verified")


if __name__ == "__main__":
    verify()
