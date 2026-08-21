from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v4"
SOURCE_ROOT = ASSET_ROOT / "sources"
CANVAS_SIZE = (768, 512)


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green_excess = g - np.maximum(r, b)
    key = np.clip((green_excess - 20.0) / 115.0, 0.0, 1.0)
    alpha = np.rint((1.0 - key) * 255.0).astype(np.uint8)
    alpha[(g > 170) & (green_excess > 100)] = 0

    a = np.maximum(alpha.astype(np.float32) / 255.0, 1e-3)
    corrected = rgb.copy()
    corrected[..., 0] = rgb[..., 0] / a
    corrected[..., 1] = (rgb[..., 1] - (1.0 - a) * 255.0) / a
    corrected[..., 2] = rgb[..., 2] / a
    return Image.fromarray(np.dstack((np.clip(corrected, 0, 255).astype(np.uint8), alpha)), "RGBA")


def trim(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("No subject found")
    return image.crop(bbox)


def split_horizontal(image: Image.Image, count: int) -> list[Image.Image]:
    edges = [round(image.width * i / count) for i in range(count + 1)]
    return [image.crop((edges[i], 0, edges[i + 1], image.height)) for i in range(count)]


def split_grid(image: Image.Image, columns: int, rows: int, count: int) -> list[Image.Image]:
    x_edges = [round(image.width * i / columns) for i in range(columns + 1)]
    y_edges = [round(image.height * i / rows) for i in range(rows + 1)]
    cells = []
    for i in range(count):
        row, column = divmod(i, columns)
        cells.append(
            image.crop(
                (
                    x_edges[column] + 2,
                    y_edges[row] + 2,
                    x_edges[column + 1] - 2,
                    y_edges[row + 1] - 2,
                )
            )
        )
    return cells


def fit_height(image: Image.Image, height: int) -> Image.Image:
    return image.resize((round(image.width * height / image.height), height), Image.Resampling.LANCZOS)


def fit_width(image: Image.Image, width: int) -> Image.Image:
    return image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)


def place(background: Image.Image, subject: Image.Image, center: tuple[int, int]) -> Image.Image:
    frame = background.copy()
    frame.alpha_composite(subject, (round(center[0] - subject.width / 2), round(center[1] - subject.height / 2)))
    return frame.convert("RGB")


def posterior_background() -> Image.Image:
    return Image.open(ASSET_ROOT / "shared" / "posterior-table-master.png").convert("RGBA").resize(
        CANVAS_SIZE, Image.Resampling.LANCZOS
    )


def lateral_background() -> Image.Image:
    return Image.open(ASSET_ROOT / "shared" / "lateral-table-master.png").convert("RGBA").resize(
        CANVAS_SIZE, Image.Resampling.LANCZOS
    )


def correct_seated_poses() -> list[Image.Image]:
    sheet = chroma_to_alpha(Image.open(SOURCE_ROOT / "correct-seated-poses.png"))
    return [trim(cell) for cell in split_horizontal(sheet, 4)]


def posterior_start_right_45() -> Image.Image:
    return trim(chroma_to_alpha(Image.open(SOURCE_ROOT / "posterior-start-right-45.png")))


def build_dix() -> list[Image.Image]:
    sheet = chroma_to_alpha(Image.open(SOURCE_ROOT / "dix-hallpike-right-subjects.png"))
    subjects = [trim(cell) for cell in split_horizontal(sheet, 3)]
    background = posterior_background()
    start_seated = fit_height(correct_seated_poses()[0], 340)
    turned_seated = fit_height(posterior_start_right_45(), 340)
    supine = fit_height(subjects[2], 315)
    return [
        place(background, start_seated, (384, 330)),
        place(background, turned_seated, (384, 330)),
        place(background, supine, (384, 220)),
    ]


def build_epley() -> list[Image.Image]:
    source = Image.open(SOURCE_ROOT / "epley-right-subjects.png").convert("RGB")
    subjects = [trim(chroma_to_alpha(cell)) for cell in split_grid(source, 4, 2, 7)]

    dix_sheet = chroma_to_alpha(Image.open(SOURCE_ROOT / "dix-hallpike-right-subjects.png"))
    right_head_hanging = trim(split_horizontal(dix_sheet, 3)[2])
    subjects[2] = right_head_hanging
    subjects[3] = right_head_hanging.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    # Visible landmarks take precedence over generator labels.
    # Right yaw points screen-left in poses 2-3; opposite yaw points screen-right in pose 4.
    for index in (1,):
        subjects[index] = subjects[index].transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    background = posterior_background()
    seated_poses = correct_seated_poses()
    seated = {
        0: fit_height(seated_poses[0], 340),
        1: fit_height(posterior_start_right_45(), 340),
        5: fit_height(seated_poses[2], 300),
        6: fit_height(seated_poses[3], 300),
    }
    subjects[4] = subjects[4].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    lying = {index: fit_height(subjects[index], 315) for index in (2, 3, 4)}
    return [
        place(background, seated[0], (384, 330)),
        place(background, seated[1], (384, 330)),
        place(background, lying[2], (384, 220)),
        place(background, lying[3], (384, 220)),
        place(background, lying[4], (384, 220)),
        place(background, seated[5], (455, 270)),
        place(background, seated[6], (455, 270)),
    ]


def gufoni_cells(row: int) -> list[Image.Image]:
    source = Image.open(SOURCE_ROOT / "gufoni-right-subjects.png").convert("RGB")
    y0 = round(source.height * row / 2) + 2
    y1 = round(source.height * (row + 1) / 2) - 2
    x_edges = [0, round(source.width * 0.18), round(source.width * 0.50), round(source.width * 0.82), source.width]
    return [trim(chroma_to_alpha(source.crop((x_edges[i] + 2, y0, x_edges[i + 1] - 2, y1)))) for i in range(4)]


def build_gufoni(row: int, head_moves_to: str) -> list[Image.Image]:
    subjects = gufoni_cells(row)
    if head_moves_to == "screen-right":
        subjects[1] = subjects[1].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        subjects[2] = subjects[2].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    background = lateral_background()
    edge_seated = fit_height(correct_seated_poses()[1], 320)
    lying = [fit_width(subjects[i], 500) for i in (1, 2)]
    return [
        place(background, edge_seated, (384, 320)),
        place(background, lying[0], (384, 235)),
        place(background, lying[1], (384, 235)),
        place(background, edge_seated, (384, 320)),
    ]


def save_storyboard(frames: list[Image.Image], path: Path) -> None:
    columns = 2
    rows = (len(frames) + 1) // 2
    sheet = Image.new("RGB", (768, rows * 276), "white")
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        row, column = divmod(index, columns)
        thumb = frame.resize((360, 240), Image.Resampling.LANCZOS)
        x, y = column * 384 + 12, row * 276 + 24
        sheet.paste(thumb, (x, y))
        draw.text((x, row * 276 + 6), f"Frame {index + 1}", fill="black")
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def save_variant(
    maneuver: str,
    side: str,
    frames: list[Image.Image],
    sequence: list[int],
    durations: list[int],
) -> dict[str, object]:
    output = ASSET_ROOT / maneuver / side
    frame_dir = output / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{index:02d}.png")
    save_storyboard(frames, output / "review" / "storyboard.png")
    animation = [frames[index] for index in sequence]
    gif_path = output / f"{maneuver}-{side}.gif"
    animation[0].save(
        gif_path,
        save_all=True,
        append_images=animation[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=True,
    )
    return {
        "gif": str(gif_path.relative_to(ROOT)).replace("\\", "/"),
        "keyframes": len(frames),
        "durations_ms": durations,
        "size": list(CANVAS_SIZE),
    }


def main() -> None:
    builds = {
        "dix-hallpike-posterior": (build_dix(), [0, 1, 2, 1, 0], [900, 900, 1800, 350, 900]),
        "epley-posterior": (build_epley(), list(range(7)), [700, 700, 1700, 1700, 1700, 900, 700]),
        "gufoni-horizontal-geotropic": (
            build_gufoni(0, "screen-right"),
            [0, 1, 2, 3],
            [700, 1500, 1700, 900],
        ),
        "gufoni-horizontal-apogeotropic": (
            build_gufoni(1, "screen-left"),
            [0, 1, 2, 3],
            [700, 1500, 1700, 900],
        ),
    }

    manifest = {
        "version": 4,
        "status": "clinical-review-required",
        "accuracy_priority": "movement geometry and support points outrank realism",
        "camera_rules": {
            "dix_hallpike_epley": "centered foot-end view; backward movement follows the vertical table axis",
            "gufoni": "straight frontal view; lateral movement follows the horizontal table axis",
        },
        "transform_rule": "No patient pose is rotated or skewed to fit a table.",
        "maneuvers": {},
    }
    for maneuver, (right, sequence, durations) in builds.items():
        left = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in right]
        manifest["maneuvers"][maneuver] = {
            "right": save_variant(maneuver, "right", right, sequence, durations),
            "left": save_variant(maneuver, "left", left, sequence, durations),
        }

    (ASSET_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")


if __name__ == "__main__":
    main()
