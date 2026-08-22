from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

# NOTE: keep every print()/failure message ASCII-only. The Windows console
# uses cp932, so writing Japanese to stdout can raise UnicodeEncodeError even
# when the underlying files are fine (files are written with encoding='utf-8'
# elsewhere in this pipeline; only *console output* needs to stay ASCII).

ROOT = Path(__file__).resolve().parents[1]
FILMS_ROOT = ROOT / "public" / "poses" / "films"
SRC_JSON = ROOT / "src" / "data" / "poseFilms.json"
SIZE = 320
FILM_COUNT = 11

# film id が game 側で必要とする 11 本すべて含まれているかのチェック用。
# ハードコードでよい (brief 参照)
REQUIRED_GAME_FILM_IDS = [
    "epley_r",
    "epley_l",
    "lempert_r",
    "lempert_l",
    "gufoni_geo_r",
    "gufoni_geo_l",
    "gufoni_apo_r",
    "gufoni_apo_l",
    "dix_hallpike_r",
    "dix_hallpike_l",
    "headroll",
]
# Max allowed bbox-center shift between ADJACENT frames, as a fraction of the
# canvas width. This is the camera-fixed check: a compose bug that re-crops
# each frame to its own bbox (instead of one shared bbox per film) makes the
# subject visibly jump/re-scale frame to frame. Real maneuvers include a few
# fast holds-to-hold transitions (e.g. the quick head-drop in Dix-Hallpike)
# that legitimately move ~0.05-0.09 of the frame in a single interpolation
# step, so the threshold is set above that observed real-content maximum
# while staying far below what a per-frame recrop bug would produce.
MAX_CENTER_DRIFT = 0.10

# Right/left pairs. headroll sweeps both sides in one clip, so it has no pair.
PAIRS = [
    ("dix_hallpike_r", "dix_hallpike_l"),
    ("epley_r", "epley_l"),
    ("gufoni_geo_r", "gufoni_geo_l"),
    ("gufoni_apo_r", "gufoni_apo_l"),
    ("lempert_r", "lempert_l"),
]


def load_frames(film_id: str, entry: dict) -> list[Image.Image]:
    # frame["file"] は FILMS_ROOT からの相対パス (film_id を含む)
    return [Image.open(FILMS_ROOT / frame["file"]).convert("RGBA") for frame in entry["frames"]]


def main() -> None:
    manifest_path = FILMS_ROOT / "manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"missing {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    by_id = {entry["id"]: entry for entry in manifest}

    failures: list[str] = []
    if len(manifest) != FILM_COUNT:
        failures.append(f"film count is {len(manifest)}, expected {FILM_COUNT}")

    # ── ゲーム側との整合チェック ──────────────────────────
    # src/data/poseFilms.json は public/poses/films/manifest.json のコピー。
    # public/ はアプリから import できないので、同じ内容を src/ 側にも置く
    if not SRC_JSON.exists():
        failures.append(f"missing {SRC_JSON}")
    else:
        pose_films = json.loads(SRC_JSON.read_text(encoding="utf-8"))
        if pose_films != manifest:
            failures.append(f"{SRC_JSON} does not match {manifest_path}")
        for entry in pose_films:
            film_id = entry.get("id", "?")
            for frame in entry.get("frames", []):
                if not (FILMS_ROOT / frame["file"]).exists():
                    failures.append(f"{SRC_JSON}: {film_id}: file missing: {frame['file']}")

    missing_ids = [fid for fid in REQUIRED_GAME_FILM_IDS if fid not in by_id]
    if missing_ids:
        failures.append(f"missing required game film ids: {missing_ids}")

    frames_cache: dict[str, list[Image.Image]] = {}

    for entry in manifest:
        film_id = entry["id"]
        directory = FILMS_ROOT / film_id
        if not directory.is_dir():
            failures.append(f"{film_id}: folder missing")
            continue

        expected_files = [Path(frame["file"]).name for frame in entry["frames"]]
        files_on_disk = sorted(path.name for path in directory.glob("frame-*.webp"))
        if files_on_disk != sorted(expected_files):
            failures.append(
                f"{film_id}: frame count does not match manifest "
                f"(disk={len(files_on_disk)} manifest={len(expected_files)})"
            )
            continue

        # frame["file"] should be a FILMS_ROOT-relative path (manifest format).
        # A stale/mismatched manifest (e.g. old bare-filename format) would
        # otherwise crash Image.open with an unhandled FileNotFoundError; report
        # it as a normal failure instead so the whole check list still prints.
        missing_frame_files = [f["file"] for f in entry["frames"] if not (FILMS_ROOT / f["file"]).exists()]
        if missing_frame_files:
            failures.append(f"{film_id}: frame path(s) not resolvable under {FILMS_ROOT}: {missing_frame_files}")
            continue

        images = load_frames(film_id, entry)
        frames_cache[film_id] = images

        centers: list[tuple[float, float] | None] = []
        for index, image in enumerate(images):
            if image.size != (SIZE, SIZE):
                failures.append(f"{film_id}[{index}]: size is {image.size}, expected {SIZE}x{SIZE}")
            if "A" not in image.getbands():
                failures.append(f"{film_id}[{index}]: no alpha channel")
                centers.append(None)
                continue

            alpha = image.getchannel("A")
            low, high = alpha.getextrema()
            if low == high:
                failures.append(f"{film_id}[{index}]: alpha is uniform (background not transparent)")
            box = alpha.getbbox()
            if box is None:
                failures.append(f"{film_id}[{index}]: subject bbox is empty")
                centers.append(None)
            else:
                centers.append(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2))

            # Adjacent frames must differ: a broken tween (e.g. interpolation
            # stuck on one pose) shows up as two consecutive identical
            # renders. Non-adjacent duplicates are expected and fine -- these
            # maneuvers legitimately revisit earlier keyframes (e.g.
            # Dix-Hallpike returns to the same seated pose it started from,
            # and Head Roll retraces the same 45/90 degree angles on the way
            # back to neutral).
            if index > 0 and image.tobytes() == images[index - 1].tobytes():
                failures.append(f"{film_id}[{index}]: identical to frame {index - 1} (tween not interpolating)")

        for index in range(1, len(centers)):
            previous = centers[index - 1]
            current = centers[index]
            if previous is None or current is None:
                continue
            dx = abs(current[0] - previous[0]) / SIZE
            dy = abs(current[1] - previous[1]) / SIZE
            drift = max(dx, dy)
            if drift > MAX_CENTER_DRIFT:
                failures.append(
                    f"{film_id}: bbox center shifted {drift:.3f} between frames "
                    f"{index - 1} and {index} (over {MAX_CENTER_DRIFT})"
                )

    for right_id, left_id in PAIRS:
        right = by_id.get(right_id)
        left = by_id.get(left_id)
        if right is None or left is None:
            failures.append(f"{right_id}/{left_id}: missing from manifest")
            continue
        if len(right["frames"]) != len(left["frames"]):
            failures.append(
                f"{left_id}: frame count differs from {right_id} "
                f"({len(left['frames'])} != {len(right['frames'])})"
            )
            continue
        if right_id not in frames_cache or left_id not in frames_cache:
            # already reported above (missing folder / bad frame paths / count mismatch)
            continue
        right_images = frames_cache[right_id]
        left_images = frames_cache[left_id]
        for index, (right_image, left_image) in enumerate(zip(right_images, left_images)):
            if right_image.tobytes() == left_image.tobytes():
                failures.append(f"{left_id}[{index}]: identical to {right_id} (mirroring not applied)")

    if failures:
        print(f"{len(failures)} failures")
        for line in failures:
            print(f"  - {line}")
        raise SystemExit(1)
    print(f"film verification passed: {len(manifest)} films")


if __name__ == "__main__":
    main()
