# v5 deterministic maneuver animation

## Why the method changed

The v3 and v4 independently generated illustrations were rejected. Patient scale,
pelvis position, limb length, and table registration changed between poses, so a
smooth GIF could not be built reliably. Visual realism did not compensate for the
clinical geometry errors.

v5 is rendered entirely by `scripts/render_maneuver_pixelart_v5.py`. It uses one
fixed game-sprite skeleton and changes only joint angles and facing metadata. No
AI-generated patient frame is used.

## Locked geometry

- Logical canvas: 192 x 128 pixels; output: 768 x 512 using 4x nearest-neighbor scaling.
- Posterior-maneuver pelvis anchor: `(82, 70)` in every keyframe and tween frame.
- Gufoni pelvis anchor: `(96, 67)` in every keyframe and tween frame.
- Head diameter, torso width, leg spacing, torso length, thigh length, and lower-leg length are immutable.
- The table and shoulder pillow are redrawn from the same code and coordinates in every frame.
- Left assets are exact pixel mirrors of the reviewed right assets.
- Joint-angle interpolation is used; bitmap crossfades and per-frame resizing are prohibited.

The measured values and all-frame deltas are written to `geometry.json` and checked
by `scripts/verify_maneuver_assets_v5.py`.

## Clinical geometry represented

- Dix-Hallpike: seated at the table axis, head yaw first, then backward descent;
  shoulders contact the inboard pillow and the head extends beyond it.
- Epley: Dix-Hallpike position, opposite head yaw, body roll with nose down, then
  rise on the same side toward which the body is facing.
- Gufoni geotropic: lateral descent toward the unaffected side, then nose down.
- Gufoni apogeotropic/Appiani: lateral descent toward the affected side, then nose up.

The posterior and lateral maneuvers use different camera/table layouts so their
movement axes cannot be mistaken for one another.

## Approval state

Technical registration is automated and passing. Clinical review is still required;
v5 is intentionally excluded from the application and PWA cache until the domain
owner approves the pose sequence and visible direction markers.
