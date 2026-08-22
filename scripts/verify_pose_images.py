from __future__ import annotations

import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POSES = ROOT / "public" / "poses"
POSE_IMAGES_TS = ROOT / "src" / "data" / "poseImages.ts"
SIZE = 512
# fitCamera は被写体の bbox を margin 0.08 でフレームに収めるので、
# 制約側の軸は必ず 1/1.08 = 0.926 前後まで埋まる。
# 「縦横とも」を要求すると、仰臥位のような横長の被写体が
# 正方形フレームで縦に余るため必ず落ちる。長い方の軸だけを見る
MIN_FILL_LONG = 0.90
# 短い方の軸がここまで潰れていたら、画角か framing の選択が間違っている
MIN_FILL_SHORT = 0.20

ENTRY = re.compile(r"^  ([a-z0-9_]+): \{\s*file: '([^']+)'", re.MULTILINE)
STRIPS = {"lempert_full", "lempert_half"}


def main() -> None:
    text = POSE_IMAGES_TS.read_text(encoding="utf-8")
    names = {pose_id: file for pose_id, file in ENTRY.findall(text)}
    failures: list[str] = []
    signatures: dict[bytes, str] = {}

    for pose_id, file in sorted(names.items()):
        path = POSES / file
        if not path.exists():
            failures.append(f"{pose_id}: {file} が無い")
            continue
        image = Image.open(path).convert("RGBA")
        if image.size != (SIZE, SIZE):
            failures.append(f"{pose_id}: サイズが {image.size}、{SIZE}x{SIZE} でない")
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] != 0:
            failures.append(f"{pose_id}: 完全透明な画素が無い（背景が抜けていない）")

        box = alpha.getbbox()
        if box is None:
            failures.append(f"{pose_id}: 被写体が空")
            continue
        # 帯状合成は横長になるので、縦の占有率だけを見る
        fill_x = (box[2] - box[0]) / SIZE
        fill_y = (box[3] - box[1]) / SIZE
        if pose_id in STRIPS:
            if fill_x < MIN_FILL_LONG:
                failures.append(f"{pose_id}: 帯の横占有率が {fill_x:.2f}（{MIN_FILL_LONG} 未満）")
        else:
            if max(fill_x, fill_y) < MIN_FILL_LONG:
                failures.append(
                    f"{pose_id}: 長辺の占有率が {max(fill_x, fill_y):.2f}"
                    f"（{MIN_FILL_LONG} 未満、実測 {fill_x:.2f}x{fill_y:.2f}）"
                )
            if min(fill_x, fill_y) < MIN_FILL_SHORT:
                failures.append(
                    f"{pose_id}: 短辺の占有率が {min(fill_x, fill_y):.2f}"
                    f"（{MIN_FILL_SHORT} 未満、実測 {fill_x:.2f}x{fill_y:.2f}）"
                )

        signature = image.tobytes()
        if signature in signatures:
            failures.append(f"{pose_id}: {signatures[signature]} と同一画像")
        signatures[signature] = pose_id

    if failures:
        print(f"{len(failures)} 件失敗")
        for line in failures:
            print(f"  - {line}")
        raise SystemExit(1)
    print(f"画像検証を通過した: {len(names)} 枚")


if __name__ == "__main__":
    main()
