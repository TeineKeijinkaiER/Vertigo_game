# Visual Production and QA

## Canonical scene

Choose one canvas, patient, clothing, lighting, and rendering style for the asset family. Choose camera, bed orientation, and pillow separately for each maneuver according to its dominant movement plane. Recommended defaults for compact web education are 768 x 512 pixels, a restrained 3D animated-film illustration, clear anatomy, soft neutral lighting, and no text inside the image.

Treat the patient and clinician as different roles. Unless the scenario explicitly requires hospital clothing, dress the patient in stable casual clothing rather than scrubs, a white coat, or another clinician uniform. When a project provides an existing character family, use those assets as the primary style reference and record the chosen ethnicity, age range, clothing, hair, and proportions in the project file.

Render the background once. It may contain the bed, pillow, floor, and room elements, but never the patient. Every patient pose must be a full-canvas RGBA layer registered to the same coordinate system. Composite the same background bytes into every frame.

Treat pillows as clinical supports, not decoration. Specify the pillow role and contact point before drawing it. For a shoulder-supported head-extension setup, place the firm pillow inboard from the head end under the shoulders/upper thorax, leave visible space headward of the pillow, and reject any pose that rests the occiput on that shoulder pillow.

Lock the background only after a clinical motion storyboard is approved. A fixed but clinically misleading background is a failure. Do not reuse one background across maneuvers with different movement planes. Typical examples:

- A backward-fall test should show the table long axis in the visible backward direction.
- A side-fall maneuver should show enough table width to make left-versus-right descent obvious.
- A sequence combining head-only yaw and body roll needs a view that distinguishes those two axes.

## Coordinate specification

Define the camera direction, screen-side convention, bed and pillow bounds, sitting and lying anchors, patient bounding box, head/shoulder/pelvis/heel anchors, reviewed master side, and mirroring rule.

Never infer screen direction from the maneuver label alone. For every directional pose, record all three fields: anatomical direction, camera relationship, and expected screen direction of a visible landmark. Example for a camera facing the patient: `anatomical: right`, `screen: left`, `landmark: nose points screen-left`. Reject a generated frame if the landmark points the wrong way even when its caption or prompt says the correct side.

Do not change camera angle within one animation. If a second view is clinically necessary, make it a separately labeled animation instead of an unlabeled cut.

Do not rotate or skew an isolated patient after generation to make the body align with a bed. Patient midline, table long axis, gravity, and contact surface must already agree in the source pose. If they do not, reject and regenerate the pose.

## Image generation

Use case: `scientific-educational`.

Generate one canonical style reference first. For later poses, repeat these invariants: same patient identity and proportions, same clothing, same camera, full body visible, transparent background, no bed, no pillow, no text, no arrows, and no extra limbs. Ask for one pose per image unless a sprite sheet is needed for a draft.

Inspect every generated layer before compositing. Regenerate anatomy errors rather than hiding them with a crop. Preserve final selected layers in the project.

Do not use independent image generation when animation registration is the dominant requirement. Warning signs include changing apparent height, hip drift, changing limb lengths, changing table contact, or a need to rotate/rescale each pose manually. After two failed registration corrections, switch to a deterministic puppet, fixed-bone vector renderer, pixel-art/game sprite, or rigged 3D model.

## Programmatic sprites and rigs

Define one skeleton with immutable segment lengths and named anchors such as pelvis, shoulders, head center, knees, ankles, and hands. Store pose changes as joint rotations or coordinates in one table. Keep the pelvis/hip anchor fixed whenever the clinical movement rotates around that point. Render at a fixed logical resolution; nearest-neighbor upscaling is acceptable when pixel art makes direction clearer.

Interpolate joint angles while preserving segment lengths. Never interpolate independently generated bitmaps. Automated checks must cover keyframes and tween frames for hip drift, bone-length variation, canvas scale, background identity, side direction, and exact mirroring when claimed.

Image generation may return a checkerboard baked into RGB even when transparency was requested. Inspect the actual alpha channel. If alpha is absent, regenerate on a flat chroma background or use a reviewed subject-extraction step; never treat a visible checkerboard as transparency.

## Animation timing

Prefer readable pose-to-pose movement over cinematic interpolation. Include enough transition poses that the direction is unambiguous. Avoid crossfades between anatomically different poses. Encode clinically meaningful holds as frame durations rather than duplicate images.

## Automated checks

Confirm identical canvas dimensions, valid alpha, unchanged background pixels outside the subject, GIF frame order and timing, pixel-exact mirroring when claimed, at least three accepted videos, no open review issues, and approved clinical sign-off.

## Visual and clinical checks

Automation cannot judge the maneuver. Compare each key pose with all recorded timestamps for side, sequence, movement axis, head yaw/pitch/roll, neck support, shoulder/pelvis/leg continuity, bed contact, scale, identity, start/return pose, camera motion, cropping, anatomy defects, and flicker. Log the result rather than relying on memory.

Use a pose-by-pose comparison table with one row per animation frame and one column per reference video. A frame cannot pass when the sequence label is correct but the visible body movement, face direction, or body-to-bed geometry differs from the videos.

Score clinical geometry before rendering quality. Suggested gate: movement axis 25 points, side/direction 20, joint/head angles 20, support/contact points 20, sequence/timing 10, style/finish 5. Any zero in the first four categories is an automatic rejection regardless of total score.
