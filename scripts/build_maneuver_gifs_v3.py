from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v3"
SOURCE_ROOT = ASSET_ROOT / "sources"
BACKGROUND_PATH = ASSET_ROOT / "shared" / "scene-background.png"
CANVAS_SIZE = (768, 512)


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green_excess = g - np.maximum(r, b)
    key = np.clip((green_excess - 20.0) / 115.0, 0.0, 1.0)
    alpha = np.rint((1.0 - key) * 255.0).astype(np.uint8)
    alpha[(g > 170) & (green_excess > 100)] = 0

    # Suppress green spill in antialiased edge pixels.
    a = np.maximum(alpha.astype(np.float32) / 255.0, 1e-3)
    corrected = rgb.copy()
    corrected[..., 0] = rgb[..., 0] / a
    corrected[..., 1] = (rgb[..., 1] - (1.0 - a) * 255.0) / a
    corrected[..., 2] = rgb[..., 2] / a
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack((corrected, alpha)), "RGBA")


def split_horizontal(image: Image.Image, count: int) -> list[Image.Image]:
    edges = [round(image.width * index / count) for index in range(count + 1)]
    return [image.crop((edges[index], 0, edges[index + 1], image.height)) for index in range(count)]


def split_grid_source(image: Image.Image, columns: int, rows: int, count: int) -> list[Image.Image]:
    x_edges = [round(image.width * index / columns) for index in range(columns + 1)]
    y_edges = [round(image.height * index / rows) for index in range(rows + 1)]
    cells = []
    for index in range(count):
        row, column = divmod(index, columns)
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


def trim_subject(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("The chroma-key frame contains no visible subject")
    return image.crop(bbox)


def fit_height(image: Image.Image, height: int) -> Image.Image:
    width = round(image.width * height / image.height)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def fit_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def compose(background: Image.Image, subject: Image.Image, center: tuple[int, int]) -> Image.Image:
    frame = background.copy()
    position = (round(center[0] - subject.width / 2), round(center[1] - subject.height / 2))
    frame.alpha_composite(subject, position)
    return frame


def make_dix_right_frames() -> list[Image.Image]:
    sheet = chroma_to_alpha(Image.open(SOURCE_ROOT / "dix-hallpike-right-subjects.png"))
    subjects = [trim_subject(frame) for frame in split_horizontal(sheet, 3)]
    background = Image.open(BACKGROUND_PATH).convert("RGBA").resize(CANVAS_SIZE, Image.Resampling.LANCZOS)

    seated = [fit_height(subject, 410) for subject in subjects[:2]]
    supine = fit_height(subjects[2], 360).rotate(
        42,
        resample=Image.Resampling.BICUBIC,
        expand=True,
    )
    return [
        compose(background, seated[0], (430, 300)).convert("RGB"),
        compose(background, seated[1], (430, 300)).convert("RGB"),
        compose(background, supine, (360, 260)).convert("RGB"),
    ]


def make_epley_right_frames() -> list[Image.Image]:
    source = Image.open(SOURCE_ROOT / "epley-right-subjects.png").convert("RGB")
    subjects = [trim_subject(chroma_to_alpha(cell)) for cell in split_grid_source(source, 4, 2, 7)]

    # Correct generated yaw by visible landmark: poses 2-3 point screen-left, while pose 4
    # crosses the midline and points screen-right. Prompt labels alone are not accepted.
    for index in (1, 2, 3):
        subjects[index] = subjects[index].transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    background = Image.open(BACKGROUND_PATH).convert("RGBA").resize(CANVAS_SIZE, Image.Resampling.LANCZOS)
    seated = {index: fit_height(subjects[index], 400) for index in (0, 1, 5, 6)}
    lying = {
        index: fit_height(subjects[index], 350).rotate(42, Image.Resampling.BICUBIC, expand=True)
        for index in (2, 3, 4)
    }
    return [
        compose(background, seated[0], (430, 300)).convert("RGB"),
        compose(background, seated[1], (430, 300)).convert("RGB"),
        compose(background, lying[2], (360, 260)).convert("RGB"),
        compose(background, lying[3], (360, 260)).convert("RGB"),
        compose(background, lying[4], (360, 260)).convert("RGB"),
        compose(background, seated[5], (430, 300)).convert("RGB"),
        compose(background, seated[6], (430, 300)).convert("RGB"),
    ]


def make_gufoni_right_frames(row: int) -> list[Image.Image]:
    source = Image.open(SOURCE_ROOT / "gufoni-right-subjects.png").convert("RGB")
    y0 = round(source.height * row / 2) + 2
    y1 = round(source.height * (row + 1) / 2) - 2
    x_edges = [0, round(source.width * 0.18), round(source.width * 0.50), round(source.width * 0.82), source.width]
    cells = [source.crop((x_edges[index] + 2, y0, x_edges[index + 1] - 2, y1)) for index in range(4)]
    subjects = [trim_subject(chroma_to_alpha(cell)) for cell in cells]
    background = Image.open(BACKGROUND_PATH).convert("RGBA").resize(CANVAS_SIZE, Image.Resampling.LANCZOS)

    seated = [fit_height(subjects[index], 400) for index in (0, 3)]
    side_lying = [
        fit_width(subjects[index], 360).rotate(-42, Image.Resampling.BICUBIC, expand=True)
        for index in (1, 2)
    ]
    return [
        compose(background, seated[0], (430, 300)).convert("RGB"),
        compose(background, side_lying[0], (355, 255)).convert("RGB"),
        compose(background, side_lying[1], (355, 255)).convert("RGB"),
        compose(background, seated[1], (430, 300)).convert("RGB"),
    ]


def save_gif(frames: list[Image.Image], path: Path, sequence: list[int], durations: list[int]) -> None:
    animation = [frames[index] for index in sequence]
    path.parent.mkdir(parents=True, exist_ok=True)
    animation[0].save(
        path,
        save_all=True,
        append_images=animation[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=True,
    )


def save_storyboard(frames: list[Image.Image], path: Path) -> None:
    columns = 2
    rows = (len(frames) + columns - 1) // columns
    cell_size = (384, 276)
    sheet = Image.new("RGB", (cell_size[0] * columns, cell_size[1] * rows), "white")
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        row, column = divmod(index, columns)
        thumb = frame.resize((360, 240), Image.Resampling.LANCZOS)
        x = column * cell_size[0] + 12
        y = row * cell_size[1] + 24
        sheet.paste(thumb, (x, y))
        draw.text((x, 6 + row * cell_size[1]), f"Frame {index + 1}", fill="black")
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def main() -> None:
    builds = {
        "dix-hallpike-posterior": (make_dix_right_frames(), [0, 1, 2, 1, 0], [900, 900, 1800, 350, 900]),
        "epley-posterior": (make_epley_right_frames(), list(range(7)), [700, 700, 1700, 1700, 1700, 900, 700]),
        "gufoni-horizontal-geotropic": (make_gufoni_right_frames(0), [0, 1, 2, 3], [700, 1500, 1700, 900]),
        "gufoni-horizontal-apogeotropic": (make_gufoni_right_frames(1), [0, 1, 2, 3], [700, 1500, 1700, 900]),
    }

    maneuver_manifest = {}
    for maneuver, (right, sequence, durations) in builds.items():
        left = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in right]
        variants = {}
        for side, frames in (("right", right), ("left", left)):
            output_dir = ASSET_ROOT / maneuver / side
            frame_dir = output_dir / "frames"
            frame_dir.mkdir(parents=True, exist_ok=True)
            for index, frame in enumerate(frames, 1):
                frame.save(frame_dir / f"frame-{index:02d}.png")
            save_storyboard(frames, output_dir / "review" / "storyboard.png")
            gif_path = output_dir / f"{maneuver}-{side}.gif"
            save_gif(frames, gif_path, sequence, durations)
            variants[side] = {
                "gif": str(gif_path.relative_to(ROOT)).replace("\\", "/"),
                "frames": len(frames),
                "encoded_frames": len(sequence),
                "durations_ms": durations,
                "size": list(CANVAS_SIZE),
            }
        maneuver_manifest[maneuver] = variants

    manifest = {
        "version": 3,
        "camera": "Locked elevated foot-end view; the background is identical in every frame.",
        "direction_rule": "In the right master, patient right is screen-left and the nose points screen-left after rotation.",
        "mirroring": "The left variant is an exact horizontal mirror of the reviewed right master.",
        "maneuvers": maneuver_manifest,
    }
    (ASSET_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")


if __name__ == "__main__":
    main()
