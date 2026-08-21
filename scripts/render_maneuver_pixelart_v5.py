from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public" / "assets" / "vertigo-maneuvers-v5"
LOW_SIZE = (192, 128)
SCALE = 4
OUT_SIZE = (LOW_SIZE[0] * SCALE, LOW_SIZE[1] * SCALE)

COLORS = {
    "room": "#d9dee3",
    "floor": "#b9c0c5",
    "table": "#8d979f",
    "table_edge": "#535d66",
    "pillow": "#c9d4dc",
    "skin": "#f3b38f",
    "hair": "#70402d",
    "shirt": "#2389d7",
    "pants": "#273b61",
    "sock": "#f6f7f7",
    "outline": "#17212b",
    "nose": "#e53935",
    "marker": "#ffcf33",
}


Point = tuple[float, float]


@dataclass(frozen=True)
class Pose:
    hip: Point
    shoulder: Point
    head: Point
    knee: Point
    ankle: Point
    hand: Point
    facing: str
    body_width: int = 12
    leg_spread: int = 3
    arm_mode: str = "paired"


def distance(a: Point, b: Point) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def unit_perpendicular(a: Point, b: Point) -> Point:
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = max(math.hypot(dx, dy), 1e-6)
    return -dy / length, dx / length


def shifted(point: Point, vector: Point, amount: float) -> Point:
    return point[0] + vector[0] * amount, point[1] + vector[1] * amount


def px(point: Point) -> tuple[int, int]:
    return round(point[0]), round(point[1])


def capsule(draw: ImageDraw.ImageDraw, a: Point, b: Point, width: int, fill: str, outline: str | None = None) -> None:
    draw.line((px(a), px(b)), fill=outline or fill, width=width + (2 if outline else 0))
    radius = (width + (2 if outline else 0)) // 2
    for point in (a, b):
        x, y = px(point)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=outline or fill)
    if outline:
        draw.line((px(a), px(b)), fill=fill, width=width)
        radius = width // 2
        for point in (a, b):
            x, y = px(point)
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def draw_head(draw: ImageDraw.ImageDraw, center: Point, facing: str) -> None:
    x, y = px(center)
    draw.ellipse((x - 9, y - 9, x + 9, y + 9), fill=COLORS["outline"])
    draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=COLORS["hair"])
    draw.ellipse((x - 6, y - 5, x + 6, y + 7), fill=COLORS["skin"])

    vectors = {
        "neutral-left": (-1, 0),
        "patient-right": (0, -1),
        "patient-left": (0, 1),
        "nose-down": (0, 1),
        "nose-up": (0, -1),
        "screen-right": (1, 0),
        "screen-left": (-1, 0),
        "front": (0, 0),
    }
    vx, vy = vectors[facing]
    if facing == "front":
        draw.ellipse((x - 3, y - 1, x - 1, y + 1), fill=COLORS["outline"])
        draw.ellipse((x + 1, y - 1, x + 3, y + 1), fill=COLORS["outline"])
        draw.rectangle((x - 1, y + 3, x + 1, y + 5), fill=COLORS["nose"])
    else:
        nx, ny = x + vx * 7, y + vy * 7
        draw.ellipse((nx - 2, ny - 2, nx + 2, ny + 2), fill=COLORS["nose"])


def draw_direction_inset(draw: ImageDraw.ImageDraw, facing: str) -> None:
    center = (174, 17)
    x, y = center
    draw.rectangle((158, 4, 190, 34), fill="#eef2f4", outline=COLORS["outline"])
    draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=COLORS["skin"], outline=COLORS["outline"])
    vectors = {
        "neutral-left": (0, 1),
        "patient-right": (-1, 0),
        "patient-left": (1, 0),
        "nose-down": (0, 1),
        "nose-up": (0, -1),
        "screen-right": (1, 0),
        "screen-left": (-1, 0),
        "front": (0, 1),
    }
    vx, vy = vectors[facing]
    tip = (x + vx * 12, y + vy * 12)
    draw.line((center, tip), fill=COLORS["nose"], width=3)
    tx, ty = tip
    draw.ellipse((tx - 2, ty - 2, tx + 2, ty + 2), fill=COLORS["nose"])


def draw_person(draw: ImageDraw.ImageDraw, pose: Pose) -> None:
    torso_perp = unit_perpendicular(pose.hip, pose.shoulder)
    leg_perp = unit_perpendicular(pose.hip, pose.ankle)

    # Far and near legs use the same fixed centerline lengths.
    for amount in (-pose.leg_spread, pose.leg_spread):
        hip = shifted(pose.hip, leg_perp, amount)
        knee = shifted(pose.knee, leg_perp, amount)
        ankle = shifted(pose.ankle, leg_perp, amount)
        capsule(draw, hip, knee, 7, COLORS["pants"], COLORS["outline"])
        capsule(draw, knee, ankle, 7, COLORS["pants"], COLORS["outline"])
        foot = shifted(ankle, unit_perpendicular(pose.knee, pose.ankle), -3)
        capsule(draw, ankle, foot, 6, COLORS["sock"], COLORS["outline"])

    capsule(draw, pose.hip, pose.shoulder, pose.body_width, COLORS["shirt"], COLORS["outline"])

    if pose.arm_mode == "side":
        # Side-lying silhouette: one lower arm is hidden; the upper arm crosses the torso.
        shoulder = shifted(pose.shoulder, torso_perp, -pose.body_width * 0.2)
        elbow = ((shoulder[0] + pose.hip[0]) / 2, shoulder[1] - 7)
        capsule(draw, shoulder, elbow, 4, COLORS["skin"], COLORS["outline"])
        capsule(draw, elbow, pose.hand, 4, COLORS["skin"], COLORS["outline"])
    else:
        # Two arms share the same shoulder-to-hand length and remain attached to the torso.
        for amount in (-pose.body_width * 0.36, pose.body_width * 0.36):
            shoulder = shifted(pose.shoulder, torso_perp, amount)
            hand = shifted(pose.hand, torso_perp, amount * 0.6)
            elbow = ((shoulder[0] + hand[0]) / 2, (shoulder[1] + hand[1]) / 2)
            capsule(draw, shoulder, elbow, 4, COLORS["skin"], COLORS["outline"])
            capsule(draw, elbow, hand, 4, COLORS["skin"], COLORS["outline"])

    capsule(draw, pose.shoulder, pose.head, 4, COLORS["skin"], COLORS["outline"])
    draw_head(draw, pose.head, pose.facing)
    draw_direction_inset(draw, pose.facing)


def posterior_background(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((0, 0, 191, 127), fill=COLORS["room"])
    draw.rectangle((0, 93, 191, 127), fill=COLORS["floor"])
    draw.rectangle((18, 75, 174, 88), fill=COLORS["table_edge"], outline=COLORS["outline"])
    draw.rectangle((18, 70, 174, 80), fill=COLORS["table"], outline=COLORS["outline"])
    draw.line((36, 89, 36, 108), fill=COLORS["table_edge"], width=5)
    draw.line((156, 89, 156, 108), fill=COLORS["table_edge"], width=5)
    # Shoulder pillow: inboard from the head end, never under the occiput.
    draw.rectangle((102, 62, 114, 72), fill=COLORS["pillow"], outline=COLORS["outline"])


def gufoni_background(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle((0, 0, 191, 127), fill=COLORS["room"])
    draw.rectangle((0, 93, 191, 127), fill=COLORS["floor"])
    draw.rectangle((12, 67, 180, 79), fill=COLORS["table"], outline=COLORS["outline"])
    draw.rectangle((12, 76, 180, 84), fill=COLORS["table_edge"], outline=COLORS["outline"])
    draw.line((26, 84, 26, 108), fill=COLORS["table_edge"], width=5)
    draw.line((166, 84, 166, 108), fill=COLORS["table_edge"], width=5)


HIP_POSTERIOR = (82, 70)
HIP_GUFONI = (96, 67)


def posterior_pose(kind: str, facing: str) -> Pose:
    if kind == "seated-extended":
        return Pose(HIP_POSTERIOR, (82, 45), (82, 30), (58, 72), (34, 72), (68, 58), facing)
    if kind == "head-hanging":
        return Pose(HIP_POSTERIOR, (107, 70), (118, 81), (58, 72), (34, 72), (103, 77), facing)
    if kind == "side-roll":
        return Pose(
            HIP_POSTERIOR,
            (107, 70),
            (122, 70),
            (58, 72),
            (34, 72),
            (94, 65),
            facing,
            arm_mode="side",
        )
    if kind == "side-sit":
        shoulder = (88, 70 - math.sqrt(25**2 - 6**2))
        head = interpolate_segment(shoulder, (82, 45), (82, 30), (82, 45), (92, 34), 1.0)
        knee = (88, 70 + math.sqrt(distance(HIP_POSTERIOR, (58, 72)) ** 2 - 6**2))
        ankle = (94, knee[1] + math.sqrt(24**2 - 6**2))
        return Pose(HIP_POSTERIOR, shoulder, head, knee, ankle, (92, 60), facing)
    raise ValueError(kind)


def gufoni_pose(direction: str, facing: str) -> Pose:
    if direction == "seated":
        return Pose(HIP_GUFONI, (96, 42), (96, 27), (96, 91), (96, 115), (88, 58), facing)
    sign = 1 if direction == "screen-right" else -1
    return Pose(
        HIP_GUFONI,
        (96 + sign * 25, 67),
        (96 + sign * 40, 67),
        (96 - sign * 24, 67),
        (96 - sign * 48, 67),
        (96 + sign * 18, 60),
        facing,
        arm_mode="side",
    )


def render(background: str, pose: Pose) -> Image.Image:
    image = Image.new("RGB", LOW_SIZE)
    draw = ImageDraw.Draw(image)
    if background == "posterior":
        posterior_background(draw)
    else:
        gufoni_background(draw)
    draw_person(draw, pose)
    return image.resize(OUT_SIZE, Image.Resampling.NEAREST)


def interpolate_angle(a: float, b: float, t: float) -> float:
    delta = (b - a + math.pi) % (2 * math.pi) - math.pi
    return a + delta * t


def interpolate_segment(origin: Point, a_origin: Point, a_end: Point, b_origin: Point, b_end: Point, t: float) -> Point:
    a_angle = math.atan2(a_end[1] - a_origin[1], a_end[0] - a_origin[0])
    b_angle = math.atan2(b_end[1] - b_origin[1], b_end[0] - b_origin[0])
    length = (distance(a_origin, a_end) + distance(b_origin, b_end)) / 2
    angle = interpolate_angle(a_angle, b_angle, t)
    return origin[0] + math.cos(angle) * length, origin[1] + math.sin(angle) * length


def interpolate_pose(a: Pose, b: Pose, t: float) -> Pose:
    hip = (a.hip[0] + (b.hip[0] - a.hip[0]) * t, a.hip[1] + (b.hip[1] - a.hip[1]) * t)
    shoulder = interpolate_segment(hip, a.hip, a.shoulder, b.hip, b.shoulder, t)
    head = interpolate_segment(shoulder, a.shoulder, a.head, b.shoulder, b.head, t)
    knee = interpolate_segment(hip, a.hip, a.knee, b.hip, b.knee, t)
    ankle = interpolate_segment(knee, a.knee, a.ankle, b.knee, b.ankle, t)
    hand = interpolate_segment(shoulder, a.shoulder, a.hand, b.shoulder, b.hand, t)
    return Pose(
        hip,
        shoulder,
        head,
        knee,
        ankle,
        hand,
        a.facing if t < 0.5 else b.facing,
        round(a.body_width + (b.body_width - a.body_width) * t),
        round(a.leg_spread + (b.leg_spread - a.leg_spread) * t),
        a.arm_mode if t < 0.5 else b.arm_mode,
    )


def assert_fixed_geometry(pose: Pose, reference: Pose) -> None:
    assert pose.hip == reference.hip
    assert pose.body_width == reference.body_width
    assert pose.leg_spread == reference.leg_spread
    for actual, expected in (
        (distance(pose.hip, pose.shoulder), distance(reference.hip, reference.shoulder)),
        (distance(pose.hip, pose.knee), distance(reference.hip, reference.knee)),
        (distance(pose.knee, pose.ankle), distance(reference.knee, reference.ankle)),
    ):
        assert abs(actual - expected) <= 1e-6, (actual, expected)


def save_animation(maneuver: str, background: str, poses: list[Pose], holds: list[int]) -> tuple[int, dict[str, float]]:
    frames = [render(background, pose) for pose in poses]
    output = ASSET_ROOT / maneuver / "right"
    frame_dir = output / "frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames, 1):
        frame.save(frame_dir / f"frame-{index:02d}.png")
    animation = [frames[0]]
    animation_poses = [poses[0]]
    durations = [holds[0]]
    tween_count = 3
    for index in range(1, len(poses)):
        for tween in range(1, tween_count + 1):
            tween_pose = interpolate_pose(poses[index - 1], poses[index], tween / (tween_count + 1))
            assert_fixed_geometry(tween_pose, poses[0])
            animation.append(render(background, tween_pose))
            animation_poses.append(tween_pose)
            durations.append(90)
        animation.append(frames[index])
        animation_poses.append(poses[index])
        durations.append(holds[index])

    right_gif_path = output / f"{maneuver}-right.gif"
    animation[0].save(
        right_gif_path,
        save_all=True,
        append_images=animation[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )

    left = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in frames]
    left_animation = [frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT) for frame in animation]
    left_output = ASSET_ROOT / maneuver / "left"
    left_frame_dir = left_output / "frames"
    left_frame_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(left, 1):
        frame.save(left_frame_dir / f"frame-{index:02d}.png")
    left_animation[0].save(
        left_output / f"{maneuver}-left.gif",
        save_all=True,
        append_images=left_animation[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )

    columns = 2
    rows = (len(frames) + columns - 1) // columns
    storyboard = Image.new("RGB", (OUT_SIZE[0] * columns, (OUT_SIZE[1] + 32) * rows), "white")
    storyboard_draw = ImageDraw.Draw(storyboard)
    for index, frame in enumerate(frames):
        row, column = divmod(index, columns)
        x = column * OUT_SIZE[0]
        y = row * (OUT_SIZE[1] + 32)
        storyboard_draw.text((x + 8, y + 8), f"Frame {index + 1}", fill="black")
        storyboard.paste(frame, (x, y + 32))
    review_dir = output / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    storyboard.save(review_dir / "storyboard.png")
    reference = poses[0]
    invariants = {
        "max_hip_drift_px": max(distance(pose.hip, reference.hip) for pose in animation_poses),
        "max_torso_length_delta_px": max(
            abs(distance(pose.hip, pose.shoulder) - distance(reference.hip, reference.shoulder))
            for pose in animation_poses
        ),
        "max_thigh_length_delta_px": max(
            abs(distance(pose.hip, pose.knee) - distance(reference.hip, reference.knee))
            for pose in animation_poses
        ),
        "max_lower_leg_length_delta_px": max(
            abs(distance(pose.knee, pose.ankle) - distance(reference.knee, reference.ankle))
            for pose in animation_poses
        ),
        "body_width_px": reference.body_width,
        "head_diameter_px": 18,
        "logical_frames_checked": len(animation_poses),
    }
    return Image.open(right_gif_path).n_frames, invariants


def main() -> None:
    dix_poses = [
        posterior_pose("seated-extended", "neutral-left"),
        posterior_pose("seated-extended", "patient-right"),
        posterior_pose("head-hanging", "patient-right"),
        posterior_pose("seated-extended", "neutral-left"),
    ]
    epley_poses = [
        posterior_pose("seated-extended", "neutral-left"),
        posterior_pose("seated-extended", "patient-right"),
        posterior_pose("head-hanging", "patient-right"),
        posterior_pose("head-hanging", "patient-left"),
        posterior_pose("side-roll", "nose-down"),
        posterior_pose("side-sit", "screen-right"),
        posterior_pose("side-sit", "screen-right"),
    ]
    geo_poses = [
        gufoni_pose("seated", "neutral-left"),
        gufoni_pose("screen-right", "front"),
        gufoni_pose("screen-right", "nose-down"),
        gufoni_pose("seated", "neutral-left"),
    ]
    apo_poses = [
        gufoni_pose("seated", "neutral-left"),
        gufoni_pose("screen-left", "front"),
        gufoni_pose("screen-left", "nose-up"),
        gufoni_pose("seated", "neutral-left"),
    ]

    builds = {
        "dix-hallpike-posterior": ("posterior", dix_poses, [800, 900, 1800, 900]),
        "epley-posterior": ("posterior", epley_poses, [700, 700, 1700, 1700, 1700, 900, 700]),
        "gufoni-horizontal-geotropic": ("gufoni", geo_poses, [700, 1500, 1700, 900]),
        "gufoni-horizontal-apogeotropic": ("gufoni", apo_poses, [700, 1500, 1700, 900]),
    }

    metadata = {
        "version": 5,
        "status": "programmatic-prototype-clinical-review-required",
        "rendering": "192x128 fixed-bone game sprite, upscaled 4x with nearest-neighbor",
        "fixed_anchors": {"posterior_hip": HIP_POSTERIOR, "gufoni_hip": HIP_GUFONI},
        "maneuvers": {},
    }
    for maneuver, (background, poses, durations) in builds.items():
        encoded_frames, invariants = save_animation(maneuver, background, poses, durations)
        metadata["maneuvers"][maneuver] = {
            "durations_ms": durations,
            "encoded_frames": encoded_frames,
            "all_frame_invariants": invariants,
            "hip_coordinates": [list(pose.hip) for pose in poses],
            "torso_lengths": [round(distance(pose.hip, pose.shoulder), 3) for pose in poses],
            "thigh_lengths": [round(distance(pose.hip, pose.knee), 3) for pose in poses],
            "lower_leg_lengths": [round(distance(pose.knee, pose.ankle), 3) for pose in poses],
            "facings": [pose.facing for pose in poses],
            "joints": [
                {
                    "hip": list(pose.hip),
                    "shoulder": list(pose.shoulder),
                    "head": list(pose.head),
                    "knee": list(pose.knee),
                    "ankle": list(pose.ankle),
                }
                for pose in poses
            ],
        }
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    (ASSET_ROOT / "geometry.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="ascii")


if __name__ == "__main__":
    main()
