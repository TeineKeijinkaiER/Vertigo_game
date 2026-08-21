from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v7-rig"


def main() -> None:
    checked = 0
    for project_path in sorted(ASSET_ROOT.glob("*/project.json")):
        project = json.loads(project_path.read_text(encoding="utf-8"))
        review = json.loads((project_path.parent / "review.json").read_text(encoding="utf-8"))
        gif = Image.open(project_path.parent / project["output"])
        expected = project["frames"]
        assert gif.size == tuple(project["canvas"]), project_path
        assert gif.n_frames == len(expected), project_path
        assert gif.info.get("loop") == 0, project_path
        durations = []
        for index in range(gif.n_frames):
            gif.seek(index)
            durations.append(gif.info.get("duration"))
        assert durations == [item["duration_ms"] for item in expected], (project_path, durations)
        assert review["status"]["clinical"] == "domain-owner sign-off required"
        assert (project_path.parent / "review" / "storyboard.png").exists()
        checked += 1
    assert checked == 5, checked
    print(f"technical verification passed: {checked} GIFs")


if __name__ == "__main__":
    main()
