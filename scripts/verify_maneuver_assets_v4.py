from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v4"
EXPECTED = {
    "dix-hallpike-posterior": (3, 5, [900, 900, 1800, 350, 900], "posterior"),
    "epley-posterior": (7, 7, [700, 700, 1700, 1700, 1700, 900, 700], "posterior"),
    "gufoni-horizontal-geotropic": (4, 4, [700, 1500, 1700, 900], "lateral"),
    "gufoni-horizontal-apogeotropic": (4, 4, [700, 1500, 1700, 900], "lateral"),
}


def resized_background(kind: str) -> np.ndarray:
    name = "posterior-table-master.png" if kind == "posterior" else "lateral-table-master.png"
    return np.asarray(Image.open(ASSET_ROOT / "shared" / name).convert("RGB").resize((768, 512)))


def verify() -> None:
    manifest = json.loads((ASSET_ROOT / "manifest.json").read_text(encoding="ascii"))
    assert manifest["status"] == "clinical-review-required"
    assert manifest["transform_rule"].startswith("No patient pose is rotated")

    builder = (ROOT / "scripts" / "build_maneuver_gifs_v4.py").read_text(encoding="utf-8")
    assert ".rotate(" not in builder, "v4 must not rotate a patient to fit the table"

    posterior = resized_background("posterior")
    lateral = resized_background("lateral")
    assert not np.array_equal(posterior, lateral), "different movement planes require different backgrounds"

    for maneuver, (keyframes, gif_frames, durations, background_kind) in EXPECTED.items():
        background = resized_background(background_kind)
        right_paths = sorted((ASSET_ROOT / maneuver / "right" / "frames").glob("frame-*.png"))
        left_paths = sorted((ASSET_ROOT / maneuver / "left" / "frames").glob("frame-*.png"))
        assert len(right_paths) == len(left_paths) == keyframes, maneuver

        for right_path, left_path in zip(right_paths, left_paths):
            right = Image.open(right_path).convert("RGB")
            left = Image.open(left_path).convert("RGB")
            assert right.size == left.size == (768, 512), right_path
            assert np.array_equal(np.asarray(right.transpose(Image.Transpose.FLIP_LEFT_RIGHT)), np.asarray(left)), left_path
            unchanged = np.all(np.asarray(right) == background, axis=2)
            assert float(unchanged.mean()) > 0.45, (right_path, float(unchanged.mean()))

        for side in ("right", "left"):
            path = ASSET_ROOT / maneuver / side / f"{maneuver}-{side}.gif"
            gif = Image.open(path)
            actual_durations = []
            for index in range(gif.n_frames):
                gif.seek(index)
                actual_durations.append(gif.info.get("duration"))
                assert gif.size == (768, 512), path
            assert gif.n_frames == gif_frames, (path, gif.n_frames)
            assert actual_durations == durations, (path, actual_durations)
            assert gif.info.get("loop") == 0, path

    print("PASS: v4 technical geometry safeguards passed; clinical approval remains required")


if __name__ == "__main__":
    verify()
