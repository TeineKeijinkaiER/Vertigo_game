from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def verify(project_path: Path) -> None:
    root = project_path.parent
    config = load_json(project_path)
    review = load_json(root / config.get("review", "review.json"))
    expected_size = tuple(config["canvas"])
    background = Image.open(root / config["background"]).convert("RGBA")
    assert background.size == expected_size

    videos = [
        source
        for source in review["sources"]
        if source.get("type") == "video" and source.get("quality") in {"primary", "supporting"}
    ]
    assert len(videos) >= 3, "at least three accepted video sources are required"
    for source in videos:
        assert source.get("url", "").startswith("https://")
        assert source.get("title") and source.get("publisher") and source.get("accessed_on")
        assert source.get("timestamps"), f"timestamps missing for {source.get('title')}"

    open_issues = [issue for issue in review.get("issues", []) if issue.get("status") == "open"]
    assert not open_issues, f"open review issues: {[issue.get('id') for issue in open_issues]}"
    assert review.get("clinical_signoff", {}).get("status") == "approved", (
        "clinical sign-off is not approved"
    )

    expected_durations = [int(item["duration_ms"]) for item in config["frames"]]
    frame_paths = sorted((root / config.get("frame_dir", "frames")).glob("frame-*.png"))
    assert len(frame_paths) == len(config["frames"])

    background_array = np.asarray(background)
    for index, (item, frame_path) in enumerate(zip(config["frames"], frame_paths), 1):
        subject = Image.open(root / item["subject"]).convert("RGBA")
        frame = Image.open(frame_path).convert("RGBA")
        assert subject.size == expected_size == frame.size
        subject_array = np.asarray(subject)
        frame_array = np.asarray(frame)
        outside_subject = subject_array[..., 3] == 0
        assert np.array_equal(frame_array[outside_subject], background_array[outside_subject]), (
            f"background changed outside subject in frame {index}"
        )

    gif = Image.open(root / config["output"])
    actual_durations = []
    for index in range(gif.n_frames):
        gif.seek(index)
        actual_durations.append(gif.info.get("duration"))
        assert gif.size == expected_size
    assert gif.n_frames == len(config["frames"])
    assert actual_durations == expected_durations
    assert gif.info.get("loop") == 0

    mirror = config.get("mirror")
    if mirror:
        mirror_root = root.parent / mirror["directory"]
        mirror_frames = sorted((mirror_root / "frames").glob("frame-*.png"))
        assert len(mirror_frames) == len(frame_paths)
        for master_path, mirror_path in zip(frame_paths, mirror_frames):
            master = Image.open(master_path).convert("RGBA")
            mirrored = Image.open(mirror_path).convert("RGBA")
            expected = np.asarray(master.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
            assert np.array_equal(expected, np.asarray(mirrored)), mirror_path

    print("PASS: structure, background, sources, issues, timing, and sign-off verified")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    verify(args.project.resolve())


if __name__ == "__main__":
    main()

