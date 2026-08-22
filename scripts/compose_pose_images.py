from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# 中間成果物。public/ の下に置くと Vite が dist へコピーし precache に入る
RAW_ROOT = ROOT / ".pose-raw"
OUT_ROOT = ROOT / "public" / "poses"
SIZE = 512
QUALITY = 88

# poseImages.ts の file フィールドから id -> ファイル名を読む
POSE_IMAGES_TS = ROOT / "src" / "data" / "poseImages.ts"
ENTRY = re.compile(r"^  ([a-z0-9_]+): \{\s*file: '([^']+)'", re.MULTILINE)

def file_names() -> dict[str, str]:
    text = POSE_IMAGES_TS.read_text(encoding="utf-8")
    names = {pose_id: file for pose_id, file in ENTRY.findall(text)}
    if len(names) != 27:
        raise SystemExit(f"poseImages.ts から読めた ID が 27 件でない: {len(names)}")
    return names


def trim_to_square(image: Image.Image) -> Image.Image:
    """被写体のアルファ境界で切り出し、正方形に整えてから縮小する。"""
    box = image.getbbox()
    if box is None:
        raise SystemExit("被写体が空の画像がある")
    cropped = image.crop(box)
    side = max(cropped.width, cropped.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def compose_strip(panels: list[Image.Image]) -> Image.Image:
    """複数コマを横に並べ、全体を SIZE 幅の帯に収める。"""
    trimmed = []
    for panel in panels:
        box = panel.getbbox()
        if box is None:
            raise SystemExit("帯状合成のパネルが空")
        trimmed.append(panel.crop(box))
    height = max(item.height for item in trimmed)
    gap = height // 12
    width = sum(item.width for item in trimmed) + gap * (len(trimmed) - 1)
    strip = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = 0
    for item in trimmed:
        strip.paste(item, (x, (height - item.height) // 2))
        x += item.width + gap
    side = max(strip.width, strip.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(strip, ((side - strip.width) // 2, (side - strip.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def main() -> None:
    names = file_names()
    manifest = json.loads((RAW_ROOT / "manifest.json").read_text(encoding="utf-8"))
    grouped: dict[str, list[Path]] = {}
    for entry in manifest:
        grouped.setdefault(entry["id"], []).append(RAW_ROOT / entry["file"])

    written = 0
    for pose_id, paths in grouped.items():
        if pose_id not in names:
            raise SystemExit(f"poseImages.ts に無い ID: {pose_id}")
        panels = [
            Image.open(path).convert("RGBA") for path in sorted(paths)
        ]
        result = trim_to_square(panels[0]) if len(panels) == 1 else compose_strip(panels)
        destination = OUT_ROOT / names[pose_id]
        result.save(destination, "WEBP", quality=QUALITY, method=6)
        written += 1
        print(f"wrote {destination.name}")

    if written != 27:
        raise SystemExit(f"書き出した画像が 27 件でない: {written}")
    print(f"\n{written} images written")


if __name__ == "__main__":
    main()
