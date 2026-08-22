from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, label

ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = ROOT / "public" / "poses" / "_raw"
OUT_ROOT = ROOT / "public" / "poses"
SIZE = 512
QUALITY = 88

# poseImages.ts の file フィールドから id -> ファイル名を読む
POSE_IMAGES_TS = ROOT / "src" / "data" / "poseImages.ts"
ENTRY = re.compile(r"^  ([a-z0-9_]+): \{\s*file: '([^']+)'", re.MULTILINE)

# 撮影パネルの一部（headroll_* の5枚に加え、supine/prone/side_*/lempert_*
# などの一部コマ）は、リグが透過ではなく白背景で書き出していた。全画素が
# 不透明というものもあれば、外周にわずかな透過の縁だけがあり内側は白塗り
# というものもある。共通するのは「背景が (255,255,255) に極めて近い」こと。
# そこで白との距離が小さい画素だけを候補にし、画像の外周かすでに透過して
# いる画素とつながっている連結成分だけをクロマキーで抜く。被写体内部の色
# （肌・髪・服）や、影／マットレスに使われている灰色 (172,195,198) は白と
# の距離が候補しきい値よりずっと大きいので、連結もせず誤って透けない。
#
# 例外: side_l / side_r の raw パネルは、患側の足先が画像下端に
# ちょうど触れる構図のため、白い靴の一部がこの外周判定に巻き込まれて
# 一緒に透けてしまう（verify_pose_images.py の占有率チェックは通るが、
# 靴先がわずかに欠ける）。これは Task 9 のリグ側で白背景と透過が
# 混在して書き出されたことに起因し、被写体内部の色だけでは背景の
# 靴と本物の靴を区別できないため、この compose スクリプト側では
# 安全に直せない（README/報告に明記し、根本修正は Task 9 側に委ねる）。
DEWHITE_LOW = 6
DEWHITE_HIGH = 24
DEWHITE_CANDIDATE = 32


def dewhite_background(image: Image.Image) -> Image.Image:
    arr = np.asarray(image)
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]
    diff = 255 - rgb.min(axis=2)

    candidate = (diff <= DEWHITE_CANDIDATE) & (alpha == 255)
    if not candidate.any():
        return image

    labeled, num = label(candidate)
    if num == 0:
        return image

    keep_labels: set[int] = set()
    keep_labels |= set(np.unique(labeled[0, :]))
    keep_labels |= set(np.unique(labeled[-1, :]))
    keep_labels |= set(np.unique(labeled[:, 0]))
    keep_labels |= set(np.unique(labeled[:, -1]))

    already_transparent = alpha == 0
    if already_transparent.any():
        touching = binary_dilation(already_transparent, iterations=1) & (labeled != 0)
        keep_labels |= set(np.unique(labeled[touching]))

    keep_labels.discard(0)
    if not keep_labels:
        return image

    background_mask = np.isin(labeled, list(keep_labels))
    ramped = np.clip(
        (diff.astype(np.float32) - DEWHITE_LOW) * 255.0 / (DEWHITE_HIGH - DEWHITE_LOW),
        0,
        255,
    ).astype(np.uint8)

    new_alpha = alpha.copy()
    new_alpha[background_mask] = ramped[background_mask]
    out = arr.copy()
    out[:, :, 3] = new_alpha
    return Image.fromarray(out, "RGBA")


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
            dewhite_background(Image.open(path).convert("RGBA")) for path in sorted(paths)
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
