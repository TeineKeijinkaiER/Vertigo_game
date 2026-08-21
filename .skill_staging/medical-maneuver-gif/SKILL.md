---
name: medical-maneuver-gif
description: Research a clinical examination or treatment maneuver and create a reproducible, clinically reviewed animated GIF with a locked background, consistent illustrated patient, cited video references, and iterative visual QA. Use for educational animations of physical diagnostic or therapeutic maneuvers; do not use to diagnose a patient or replace clinician training.
---

# Medical Maneuver GIF

Create pose-to-pose educational animations whose visible movement agrees with multiple clinical demonstrations and whose production can be reproduced from files in the target project.

Clinical accuracy outranks realism. Prefer a simplified or exaggerated pose whose movement axis, angle, side, and support points are unambiguous over a realistic image that weakens or misrepresents the maneuver.

## Required workflow

1. Define the maneuver, clinical indication, side, variant, and intended audience. Treat variants with different body or head movements as separate maneuvers.
2. Read [references/research-and-clinical-review.md](references/research-and-clinical-review.md). Find at least three independent procedural videos for each maneuver or variant, preferably from universities, hospitals, professional societies, or clinician-led medical education channels. Record direct URLs, titles, publishers, access dates, and timestamps for every key movement.
3. Resolve disagreements using an authoritative guideline, peer-reviewed article, or institutional procedure. Do not silently combine incompatible variants. Mark unresolved ambiguity as an open issue.
4. Write a structured clinical sequence before generating art: start pose, dominant movement axis, direction, angle, support/contact points, bed-contact geometry, hold, next pose, and return pose. Select a camera that makes the dominant movement axis visually unambiguous. Have the domain owner approve this motion specification when the result will be used in clinical education.
5. Read [references/visual-production-and-qa.md](references/visual-production-and-qa.md). Choose the production method before rendering. Use generated raster layers only when identity, scale, anchors, and body-to-bed registration can be held constant. When those constraints fail, use a programmatic fixed-skeleton renderer, game sprite, vector puppet, or 3D rig instead of continuing independent image generation. Create a separate canonical background for each maneuver whose movement plane or camera differs. Do not reuse a bed merely for visual consistency when it obscures or changes the maneuver. Keep all selected project assets and renderer source inside the project.
6. Use `scripts/build_animation.py` to composite the unchanged background with registered RGBA subject frames, write the GIF, and optionally make a pixel-exact mirrored side.
7. Compare the storyboard and GIF with every reference video at the recorded timestamps. Compare silhouette, body-to-bed relationship, movement plane, head direction, and contact points, not just step order. Log each discrepancy with status `open`, `fixed`, `accepted-variant`, or `pass`.
8. Run `scripts/verify_animation.py`. Fix failures and repeat video comparison. Do not declare completion while any issue is `open`, fewer than three video references are documented, a required pose is absent, the background changes, or domain-owner sign-off is missing.

## Output contract

Keep each maneuver self-contained and reproducible:

```text
<maneuver>/
|-- project.json
|-- review.json
|-- background.png
|-- subjects/
|   |-- frame-01.png
|   `-- ...
|-- frames/
|   |-- frame-01.png
|   `-- ...
|-- review/
|   `-- storyboard.png
`-- <maneuver>.gif
```

`project.json` is the build configuration. `review.json` holds source citations, timestamped observations, issue history, and sign-off. Never make the build depend on opaque temporary image IDs or files outside the project.

## Completion and stopping rules

- A technical pass is not a clinical pass. Report both separately.
- The animation may simplify timing, but it must not reverse the side, movement axis, order, or clinically important support position.
- Never rotate, skew, or reposition a completed patient pose merely to make it fit an unrelated bed perspective. Regenerate the pose or redesign the camera/background.
- Reject realistic-looking art when the patient-to-bed contact geometry is wrong. Record where shoulders, occiput, pelvis, and feet contact or leave the support surface.
- For programmatic animation, store fixed bone lengths, anchor coordinates, joint angles, and interpolation rules as data. Verify every encoded frame, including tween frames, rather than checking keyframes only.
- Use source videos to understand motion, not to reproduce copyrighted frames, branding, audio, or an identifiable person's likeness.
- If reliable sources remain contradictory, or five focused correction cycles fail to resolve the same pose, stop and request domain-owner direction instead of approving the asset.
- Label the result as an educational illustration and preserve maneuver, side, and variant metadata wherever it is displayed.
