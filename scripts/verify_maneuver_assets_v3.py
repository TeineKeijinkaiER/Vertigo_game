from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v3"
EXPECTED = {
    "dix-hallpike-posterior": (3, 5, [900, 900, 1800, 350, 900]),
    "epley-posterior": (7, 7, [700, 700, 1700, 1700, 1700, 900, 700]),
    "gufoni-horizontal-geotropic": (4, 4, [700, 1500, 1700, 900]),
    "gufoni-horizontal-apogeotropic": (4, 4, [700, 1500, 1700, 900]),
}


def verify() -> None:
    background = np.asarray(
        Image.open(ASSET_ROOT / "shared" / "scene-background.png").convert("RGB").resize((768, 512))
    )
    manifest = json.loads((ASSET_ROOT / "manifest.json").read_text(encoding="ascii"))

    for maneuver, (keyframe_count, gif_frame_count, expected_durations) in EXPECTED.items():
        assert maneuver in manifest["maneuvers"], maneuver
        right_paths = sorted((ASSET_ROOT / maneuver / "right" / "frames").glob("frame-*.png"))
        left_paths = sorted((ASSET_ROOT / maneuver / "left" / "frames").glob("frame-*.png"))
        assert len(right_paths) == keyframe_count, (maneuver, len(right_paths))
        assert len(left_paths) == keyframe_count, (maneuver, len(left_paths))

        for right_path, left_path in zip(right_paths, left_paths):
            right = Image.open(right_path).convert("RGB")
            left = Image.open(left_path).convert("RGB")
            assert right.size == left.size == (768, 512), right_path
            assert np.array_equal(np.asarray(right.transpose(Image.Transpose.FLIP_LEFT_RIGHT)), np.asarray(left)), left_path

            # A majority of the frame must remain byte-identical to the canonical background.
            # This catches whole-scene regeneration, camera movement, and global post-processing.
            unchanged = np.all(np.asarray(right) == background, axis=2)
            assert float(unchanged.mean()) > 0.55, (right_path, float(unchanged.mean()))

        for side in ("right", "left"):
            gif_path = ASSET_ROOT / maneuver / side / f"{maneuver}-{side}.gif"
            gif = Image.open(gif_path)
            durations = []
            for index in range(gif.n_frames):
                gif.seek(index)
                durations.append(gif.info.get("duration"))
                assert gif.size == (768, 512), gif_path
            assert gif.n_frames == gif_frame_count, (gif_path, gif.n_frames)
            assert durations == expected_durations, (gif_path, durations)
            assert gif.info.get("loop") == 0, gif_path

    print("PASS: v3 technical asset checks passed; clinical sign-off remains separate")


if __name__ == "__main__":
    verify()
