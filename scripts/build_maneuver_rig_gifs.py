from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v7-rig"

REFERENCES = [
    {
        "title": "Dix-Hallpike Test & Epley Manoeuvre - OSCE Guide",
        "publisher": "Geeky Medics",
        "url": "https://www.youtube.com/watch?v=D6qEdlFVxig",
        "timestamps": {"dix_hallpike": "00:38", "epley": "01:14"},
        "quality": "supporting",
    },
    {
        "title": "Dix Hallpike Test and Epley Manoeuvre",
        "publisher": "TeachMeSurgery / University Hospitals of Leicester consultant demonstration",
        "url": "https://www.youtube.com/watch?v=fd8TVMOYqZg",
        "timestamps": {},
        "quality": "supporting",
    },
    {
        "title": "Training videos for healthcare professionals",
        "publisher": "Haukeland University Hospital / Helse Bergen",
        "url": "https://www.helse-bergen.no/nasjonal-kompetansetjeneste-for-vestibulere-sykdommer/oppleringsvideoar-til-helsepersonell",
        "timestamps": {},
        "quality": "primary",
    },
    {
        "title": "BPPV Videos",
        "publisher": "Stanford Medicine; videos courtesy of University of Michigan Medical School",
        "url": "https://med.stanford.edu/ohns/OHNS-healthcare/earinstitute/our-services/dizziness-clinic/BPPV-Videos.html",
        "timestamps": {},
        "quality": "primary",
    },
    {
        "title": "Videos",
        "publisher": "Kenniscentrum Duizeligheid / Gelre ziekenhuizen",
        "url": "https://www.kenniscentrumduizeligheid.nl/kenniscentrum-duizeligheid/Welkom-bij-Kenniscentrum-Duizeligheid/Videos",
        "timestamps": {},
        "quality": "primary",
    },
]


def encode_gif(root: Path, manifest: dict) -> Path:
    frames = [Image.open(root / item["file"]).convert("RGB") for item in manifest["frames"]]
    durations = [item["duration_ms"] for item in manifest["frames"]]
    output = root / f"{root.name}.gif"
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )
    return output


def storyboard(root: Path, manifest: dict) -> None:
    keyframes = [item for item in manifest["frames"] if item["key_pose"]]
    thumb_width, thumb_height = 384, 256
    label_height = 38
    sheet = Image.new("RGB", (thumb_width * 2, (thumb_height + label_height) * ((len(keyframes) + 1) // 2)), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, item in enumerate(keyframes):
        image = Image.open(root / item["file"]).convert("RGB").resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        x = (index % 2) * thumb_width
        y = (index // 2) * (thumb_height + label_height)
        sheet.paste(image, (x, y))
        draw.text((x + 10, y + thumb_height + 8), f"GIF key pose {item['pose']} | {item['duration_ms']} ms", fill="#172126", font=font)
    review_root = root / "review"
    review_root.mkdir(exist_ok=True)
    sheet.save(review_root / "storyboard.png")

    all_frames = manifest["frames"]
    columns = 6
    frame_width, frame_height = 192, 128
    rows = (len(all_frames) + columns - 1) // columns
    contact = Image.new("RGB", (frame_width * columns, (frame_height + 22) * rows), "white")
    contact_draw = ImageDraw.Draw(contact)
    for index, item in enumerate(all_frames):
        image = Image.open(root / item["file"]).convert("RGB").resize((frame_width, frame_height), Image.Resampling.LANCZOS)
        x = (index % columns) * frame_width
        y = (index // columns) * (frame_height + 22)
        contact.paste(image, (x, y))
        contact_draw.text((x + 4, y + frame_height + 4), f"{index + 1}: {item['pose']}", fill="#172126", font=font)
    contact.save(review_root / "all-frames.png")


def write_metadata(root: Path, manifest: dict, output: Path) -> None:
    project = {
        "maneuver": manifest["maneuver"],
        "side": "right" if root.name != "supine-head-roll" else "bilateral diagnostic sequence",
        "variant": root.name,
        "audience": "clinical education; educational illustration",
        "render_method": "fixed Three.js 3D rig, deterministic normalized-direction interpolation",
        "canvas": manifest["canvas"],
        "output": output.name,
        "frames": manifest["frames"],
        "source_component": "src/prototypes/ManeuverRigPrototype.tsx",
        "capture_script": "scripts/capture_maneuver_rig_frames.mjs",
        "build_script": "scripts/build_maneuver_rig_gifs.py",
    }
    review = {
        "status": {"technical": "pending automated verification", "clinical": "domain-owner sign-off required"},
        "accessed_on": date.today().isoformat(),
        "references": REFERENCES,
        "comparison_cycles": [
            {
                "id": "comparison-cycle-01",
                "artifact": "review/storyboard.png",
                "scope": "encoded GIF key poses inspected; external reference still sheet and clinician sign-off remain pending",
                "issues": [
                    {
                        "id": "CLINICAL-SIGNOFF",
                        "frame": "all",
                        "category": "clinical review",
                        "finding": "No domain-owner sign-off has been recorded.",
                        "status": "open",
                        "resolution": "Review encoded GIF against timestamped accepted reference stills and record reviewer decision.",
                        "correction_cycle": 1,
                    }
                ],
            }
        ],
        "clinical_sign_off": {"reviewer": None, "date": None, "status": "pending"},
    }
    (root / "project.json").write_text(json.dumps(project, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / "review.json").write_text(json.dumps(review, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    for manifest_path in sorted(ASSET_ROOT.glob("*/capture-manifest.json")):
        root = manifest_path.parent
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        output = encode_gif(root, manifest)
        storyboard(root, manifest)
        write_metadata(root, manifest, output)
        print(f"built {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
