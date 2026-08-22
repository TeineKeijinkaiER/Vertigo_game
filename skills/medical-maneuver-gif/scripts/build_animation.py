from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def gif_frame(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"))
    alpha = rgba[..., 3]
    opaque = Image.fromarray(rgba[..., :3], "RGB").quantize(
        colors=255, method=Image.Quantize.MEDIANCUT
    )
    indices = np.asarray(opaque, dtype=np.uint8).astype(np.uint16) + 1
    indices[alpha < 96] = 0
    result = Image.fromarray(indices.astype(np.uint8), "P")
    palette = opaque.getpalette() or []
    result.putpalette([0, 255, 0] + palette[: 255 * 3])
    result.info["transparency"] = 0
    return result


def make_storyboard(root: Path, config: dict, frames: list[Image.Image]) -> None:
    thumb_width = 256
    scale = thumb_width / frames[0].width
    thumb_height = round(frames[0].height * scale)
    label_height = 52
    sheet = Image.new("RGB", (thumb_width * len(frames), thumb_height + label_height), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (frame, item) in enumerate(zip(frames, config["frames"]), 1):
        thumb = frame.convert("RGB").resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        x = (index - 1) * thumb_width
        sheet.paste(thumb, (x, 0))
        label = f"{index:02d}  {item.get('label', '')}\n{item['duration_ms']} ms"
        draw.multiline_text((x + 6, thumb_height + 5), label, fill="black", font=font)
    review_dir = root / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    sheet.save(review_dir / "storyboard.png")


def save_gif(path: Path, frames: list[Image.Image], durations: list[int]) -> None:
    animation = [gif_frame(frame) for frame in frames]
    animation[0].save(
        path,
        save_all=True,
        append_images=animation[1:],
        duration=durations,
        loop=0,
        transparency=0,
        disposal=2,
        optimize=False,
    )


def build(project_path: Path) -> None:
    root = project_path.parent
    config = load_json(project_path)
    size = tuple(config["canvas"])
    background = Image.open(root / config["background"]).convert("RGBA")
    if background.size != size:
        raise ValueError(f"background is {background.size}, expected {size}")

    frame_dir = root / config.get("frame_dir", "frames")
    frame_dir.mkdir(parents=True, exist_ok=True)
    composites: list[Image.Image] = []
    durations: list[int] = []
    subjects: list[Image.Image] = []

    for index, item in enumerate(config["frames"], 1):
        subject = Image.open(root / item["subject"]).convert("RGBA")
        if subject.size != size:
            raise ValueError(f"{item['subject']} is {subject.size}, expected {size}")
        composite = Image.alpha_composite(background, subject)
        composite.save(frame_dir / f"frame-{index:02d}.png")
        subjects.append(subject)
        composites.append(composite)
        durations.append(int(item["duration_ms"]))

    output = root / config["output"]
    save_gif(output, composites, durations)

    mirror = config.get("mirror")
    if mirror:
        mirror_root = root.parent / mirror["directory"]
        mirror_subjects = mirror_root / "subjects"
        mirror_frames = mirror_root / "frames"
        mirror_subjects.mkdir(parents=True, exist_ok=True)
        mirror_frames.mkdir(parents=True, exist_ok=True)
        mirrored_background = background.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        mirrored_background.save(mirror_root / "background.png")
        mirrored_composites = []
        for index, subject in enumerate(subjects, 1):
            mirrored_subject = subject.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            mirrored_subject.save(mirror_subjects / f"frame-{index:02d}.png")
            mirrored = Image.alpha_composite(mirrored_background, mirrored_subject)
            mirrored.save(mirror_frames / f"frame-{index:02d}.png")
            mirrored_composites.append(mirrored)
        save_gif(mirror_root / mirror["output"], mirrored_composites, durations)

    make_storyboard(root, config, composites)
    print(f"Built {output}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    build(args.project.resolve())


if __name__ == "__main__":
    main()

