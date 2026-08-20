from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v2"


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green_excess = g - np.maximum(r, b)
    key = np.clip((green_excess - 25.0) / 105.0, 0.0, 1.0)
    alpha = np.rint((1.0 - key) * 255.0).astype(np.uint8)
    alpha[(g > 150) & (green_excess > 105)] = 0

    # Remove the green contribution from partially transparent edge pixels.
    a = np.maximum(alpha.astype(np.float32) / 255.0, 1e-3)
    corrected = rgb.copy()
    corrected[..., 0] = rgb[..., 0] / a
    corrected[..., 1] = (rgb[..., 1] - (1.0 - a) * 255.0) / a
    corrected[..., 2] = rgb[..., 2] / a
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack((corrected, alpha)), "RGBA")


def split_grid(image: Image.Image, columns: int, rows: int, count: int) -> list[Image.Image]:
    x_edges = [round(image.width * i / columns) for i in range(columns + 1)]
    y_edges = [round(image.height * i / rows) for i in range(rows + 1)]
    cell_width = max(x_edges[i + 1] - x_edges[i] for i in range(columns))
    cell_height = max(y_edges[i + 1] - y_edges[i] for i in range(rows))
    frames: list[Image.Image] = []
    for index in range(count):
        row, column = divmod(index, columns)
        cell = image.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]))
        canvas = Image.new("RGBA", (cell_width, cell_height), (0, 0, 0, 0))
        canvas.alpha_composite(cell, ((cell_width - cell.width) // 2, (cell_height - cell.height) // 2))
        frames.append(canvas)
    return frames


def polish_frame(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = image.convert("RGB")
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.8, percent=85, threshold=3))
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.04)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.01)
    polished = rgb.convert("RGBA")
    polished.putalpha(alpha)
    return polished


def compose_grid(frames: list[Image.Image], columns: int, rows: int) -> Image.Image:
    width, height = frames[0].size
    sheet = Image.new("RGBA", (width * columns, height * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        row, column = divmod(index, columns)
        sheet.alpha_composite(frame, (column * width, row * height))
    return sheet


def gif_frame(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"))
    alpha = rgba[..., 3]
    opaque = Image.fromarray(rgba[..., :3], "RGB").quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    indices = np.asarray(opaque, dtype=np.uint8).astype(np.uint16) + 1
    indices[alpha < 96] = 0
    result = Image.fromarray(indices.astype(np.uint8), "P")
    palette = opaque.getpalette() or []
    result.putpalette([0, 255, 0] + palette[: 255 * 3])
    result.info["transparency"] = 0
    return result


def write_variant(
    maneuver: str,
    side: str,
    frames: list[Image.Image],
    sequence: list[int],
    durations_ms: list[int],
) -> dict[str, object]:
    output_dir = ASSET_ROOT / maneuver / side
    frame_dir = output_dir / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{index:02d}.png")

    animation = [gif_frame(frames[index]) for index in sequence]
    gif_path = output_dir / f"{maneuver}-{side}.gif"
    animation[0].save(
        gif_path,
        save_all=True,
        append_images=animation[1:],
        duration=durations_ms,
        loop=0,
        transparency=0,
        disposal=2,
        optimize=False,
    )
    return {
        "side": side,
        "gif": str(gif_path.relative_to(ROOT)).replace("\\", "/"),
        "keyframes": len(frames),
        "encoded_frames": len(animation),
        "durations_ms": durations_ms,
        "size": list(frames[0].size),
    }


def build(
    maneuver: str,
    source: Path,
    columns: int,
    rows: int,
    count: int,
    sequence: list[int],
    durations_ms: list[int],
    flip_right_indices: set[int] | None = None,
    frame_overrides: dict[int, Path] | None = None,
    copy_right_indices: dict[int, int] | None = None,
    fixed_background: tuple[Path, int] | None = None,
    fixed_background_image: Path | None = None,
    subject_offset: tuple[int, int] = (0, 0),
) -> list[dict[str, object]]:
    rgba_sheet = chroma_to_alpha(Image.open(source))
    masters = ASSET_ROOT / "masters"
    masters.mkdir(parents=True, exist_ok=True)
    right = split_grid(rgba_sheet, columns, rows, count)
    for index, override_source in (frame_overrides or {}).items():
        override_sheet = chroma_to_alpha(Image.open(override_source))
        right[index] = split_grid(override_sheet, columns, rows, count)[index]
    for target, source_index in (copy_right_indices or {}).items():
        right[target] = right[source_index].copy()
    for index in flip_right_indices or set():
        right[index] = right[index].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if subject_offset != (0, 0):
        shifted_frames = []
        for frame in right:
            shifted = Image.new("RGBA", frame.size, (0, 0, 0, 0))
            shifted.alpha_composite(frame, subject_offset)
            shifted_frames.append(shifted)
        right = shifted_frames
    if fixed_background is not None:
        background_source, background_index = fixed_background
        background_sheet = chroma_to_alpha(Image.open(background_source))
        background = split_grid(background_sheet, columns, rows, count)[background_index]
        right = [Image.alpha_composite(background, frame) for frame in right]
    if fixed_background_image is not None:
        background = chroma_to_alpha(Image.open(fixed_background_image))
        background = background.resize(right[0].size, Image.Resampling.LANCZOS)
        right = [Image.alpha_composite(background, frame) for frame in right]
    right = [polish_frame(frame) for frame in right]
    compose_grid(right, columns, rows).save(masters / f"{maneuver}-right-rgba.png")
    left = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in right]
    return [
        write_variant(maneuver, "right", right, sequence, durations_ms),
        write_variant(maneuver, "left", left, sequence, durations_ms),
    ]


def main() -> None:
    generated = Path.home() / ".codex" / "generated_images" / "01a01e03-e3e8-7061-9b75-7945cb152b1a"
    manifest = {
        "camera": "Locked elevated foot-end view; patient right is screen-left in right-side masters.",
        "mirroring": "Left variants are exact horizontal mirrors of reviewed right-side frames.",
        "maneuvers": {
            "dix-hallpike-posterior": build(
                "dix-hallpike-posterior",
                generated / "exec-c60a5b1d-2eb7-4141-a360-16842efb289f.png",
                2,
                2,
                4,
                [0, 1, 2, 3, 0],
                [700, 700, 1800, 800, 700],
            ),
            "epley-posterior": build(
                "epley-posterior",
                generated / "exec-2d085198-89fd-4fbd-8b31-1bfe17357c23.png",
                4,
                2,
                7,
                [0, 1, 2, 3, 4, 5],
                [700, 700, 1800, 1800, 1800, 1800],
                frame_overrides={
                    5: generated / "exec-9865b974-1b07-4dc7-974d-ca858ec92935.png"
                },
                fixed_background_image=(
                    generated / "exec-7119533c-8e52-4764-94b5-c2baab35a01a.png"
                ),
                subject_offset=(48, 0),
            ),
            "gufoni-horizontal-geotropic": build(
                "gufoni-horizontal-geotropic",
                generated / "exec-855f2303-c2ab-44ac-90ae-08a81ee81bbf.png",
                2,
                2,
                4,
                [0, 1, 2, 3],
                [700, 1800, 1800, 900],
            ),
            "gufoni-horizontal-apogeotropic": build(
                "gufoni-horizontal-apogeotropic",
                generated / "exec-fbda0461-88f7-4aac-8c19-2f5e3fe86d4f.png",
                2,
                2,
                4,
                [0, 1, 2, 3],
                [700, 1800, 1800, 900],
            ),
        },
    }
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    (ASSET_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")


if __name__ == "__main__":
    main()
