from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v5"
EXPECTED_FRAMES = {
    "dix-hallpike-posterior": 4,
    "epley-posterior": 7,
    "gufoni-horizontal-geotropic": 4,
    "gufoni-horizontal-apogeotropic": 4,
}


def spread(values: list[float]) -> float:
    return max(values) - min(values)


def verify() -> None:
    geometry = json.loads((ASSET_ROOT / "geometry.json").read_text(encoding="ascii"))
    assert geometry["status"] == "programmatic-prototype-clinical-review-required"
    assert geometry["rendering"].startswith("192x128 fixed-bone")

    for maneuver, expected_count in EXPECTED_FRAMES.items():
        data = geometry["maneuvers"][maneuver]
        hips = data["hip_coordinates"]
        assert len(hips) == expected_count, maneuver
        assert all(hip == hips[0] for hip in hips), (maneuver, hips)
        assert spread(data["torso_lengths"]) <= 0.001, (maneuver, data["torso_lengths"])
        assert spread(data["thigh_lengths"]) <= 0.001, (maneuver, data["thigh_lengths"])
        assert spread(data["lower_leg_lengths"]) <= 0.001, (maneuver, data["lower_leg_lengths"])
        invariants = data["all_frame_invariants"]
        assert invariants["max_hip_drift_px"] == 0
        assert invariants["max_torso_length_delta_px"] <= 1e-6
        assert invariants["max_thigh_length_delta_px"] <= 1e-6
        assert invariants["max_lower_leg_length_delta_px"] <= 1e-6
        assert invariants["body_width_px"] == 12
        assert invariants["head_diameter_px"] == 18

        right_paths = sorted((ASSET_ROOT / maneuver / "right" / "frames").glob("frame-*.png"))
        left_paths = sorted((ASSET_ROOT / maneuver / "left" / "frames").glob("frame-*.png"))
        assert len(right_paths) == len(left_paths) == expected_count
        for right_path, left_path in zip(right_paths, left_paths):
            right = Image.open(right_path).convert("RGB")
            left = Image.open(left_path).convert("RGB")
            assert right.size == left.size == (768, 512)
            expected_left = np.asarray(right.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
            assert np.array_equal(expected_left, np.asarray(left)), left_path

        right_gif = Image.open(ASSET_ROOT / maneuver / "right" / f"{maneuver}-right.gif")
        left_gif = Image.open(ASSET_ROOT / maneuver / "left" / f"{maneuver}-left.gif")
        assert right_gif.n_frames == left_gif.n_frames == data["encoded_frames"]
        for index in range(right_gif.n_frames):
            right_gif.seek(index)
            left_gif.seek(index)
            expected_left = np.asarray(right_gif.convert("RGB").transpose(Image.Transpose.FLIP_LEFT_RIGHT))
            assert np.array_equal(expected_left, np.asarray(left_gif.convert("RGB"))), (maneuver, index)

    dix = geometry["maneuvers"]["dix-hallpike-posterior"]
    shoulder = dix["joints"][2]["shoulder"]
    head = dix["joints"][2]["head"]
    assert abs((head[0] - shoulder[0]) - (head[1] - shoulder[1])) <= 1, "head extension is not about 45 degrees"

    epley = geometry["maneuvers"]["epley-posterior"]
    assert epley["facings"][4] == "nose-down"
    assert epley["facings"][5] == "screen-right"
    assert epley["joints"][4]["shoulder"][0] > epley["joints"][4]["hip"][0]
    assert epley["joints"][5]["shoulder"][0] > epley["joints"][5]["hip"][0]

    geo = geometry["maneuvers"]["gufoni-horizontal-geotropic"]
    apo = geometry["maneuvers"]["gufoni-horizontal-apogeotropic"]
    assert geo["joints"][1]["head"][0] > geo["joints"][1]["hip"][0]
    assert apo["joints"][1]["head"][0] < apo["joints"][1]["hip"][0]
    assert geo["facings"][2] == "nose-down"
    assert apo["facings"][2] == "nose-up"

    print("PASS: v5 fixed-bone, fixed-hip, direction, and mirroring checks passed")


if __name__ == "__main__":
    verify()
