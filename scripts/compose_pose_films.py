from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# 中間成果物。public/ の下に置くと Vite が dist へ丸ごとコピーし、
# PWA の precache にも入ってしまうので外に出す
RAW_ROOT = ROOT / ".pose-raw"
FILMS_RAW_ROOT = RAW_ROOT / "films"
OUT_ROOT = ROOT / "public" / "poses" / "films"
# アプリからは public/ を import できないので、同じ内容をゲーム側の
# src/ にも書き出す。tsconfig の resolveJsonModule でそのまま import できる
SRC_JSON = ROOT / "src" / "data" / "poseFilms.json"
SIZE = 320
QUALITY = 82
FILM_COUNT = 12

Box = tuple[int, int, int, int]


def union_bbox(frames: list[Image.Image]) -> Box:
    """全コマのアルファ境界の和を取る。

    コマごとに自分のbboxで切り出すと、コマごとに被写体の位置とサイズが
    ずれて画面内で跳ねて見える。フィルム全体で共通のバウンディングボックスを
    使うことで、カメラが固定されたまま被写体だけが動いて見えるようにする。
    """
    box: Box | None = None
    for frame in frames:
        frame_box = frame.getbbox()
        if frame_box is None:
            raise SystemExit("被写体が空のフレームがある")
        if box is None:
            box = frame_box
        else:
            box = (
                min(box[0], frame_box[0]),
                min(box[1], frame_box[1]),
                max(box[2], frame_box[2]),
                max(box[3], frame_box[3]),
            )
    assert box is not None
    return box


def crop_to_square(image: Image.Image, box: Box) -> Image.Image:
    cropped = image.crop(box)
    side = max(cropped.width, cropped.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def main() -> None:
    films_json = RAW_ROOT / "films.json"
    if not films_json.exists():
        raise SystemExit(f"{films_json} が無い。先に capture_pose_images.mjs を実行すること")
    films = json.loads(films_json.read_text(encoding="utf-8"))
    if len(films) != FILM_COUNT:
        raise SystemExit(f"films.json のフィルム数が {FILM_COUNT} でない: {len(films)}")

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = []
    total_frames = 0

    for film in films:
        film_id = film["id"]
        source_dir = FILMS_RAW_ROOT / film_id
        images = [
            Image.open(source_dir / frame["file"]).convert("RGBA")
            for frame in film["frames"]
        ]
        box = union_bbox(images)

        destination_dir = OUT_ROOT / film_id
        destination_dir.mkdir(parents=True, exist_ok=True)
        # 既存の書き出しを消してから作り直す。フレーム数が減ったときに
        # 古いファイルが残らないようにする
        for stale in destination_dir.glob("*.webp"):
            stale.unlink()

        frame_entries = []
        for index, (image, frame) in enumerate(zip(images, film["frames"])):
            square = crop_to_square(image, box)
            out_name = f"frame-{index:03d}.webp"
            square.save(destination_dir / out_name, "WEBP", quality=QUALITY, method=6)
            # file は public/poses/films/ からの相対パス（film_id を含む）。
            # ManeuverFilm.tsx がこの値だけで画像URLを組み立てられるようにする
            frame_entries.append({"file": f"{film_id}/{out_name}", "durationMs": frame["duration_ms"]})
            total_frames += 1

        manifest.append({"id": film_id, "caption": film.get("caption", ""), "frames": frame_entries})
        print(f"wrote {film_id} ({len(frame_entries)} frames)")

    manifest_text = f"{json.dumps(manifest, ensure_ascii=False, indent=2)}\n"
    (OUT_ROOT / "manifest.json").write_text(manifest_text, encoding="utf-8")
    SRC_JSON.parent.mkdir(parents=True, exist_ok=True)
    SRC_JSON.write_text(manifest_text, encoding="utf-8")

    if len(manifest) != FILM_COUNT:
        raise SystemExit(f"書き出したフィルム数が {FILM_COUNT} でない: {len(manifest)}")
    print(f"\n{total_frames} film frames written for {len(manifest)} films")


if __name__ == "__main__":
    main()
