---
name: medical-maneuver-gif
description: Research a clinical examination or treatment maneuver and create a reproducible educational GIF using a fixed 3D rig or registered subject layers, with cited procedural evidence and separate technical and clinical review gates. Use for animations of physical diagnostic or therapeutic maneuvers; do not use to diagnose a patient, prescribe care, or claim unrecorded clinical approval.
---

# Medical Maneuver GIF

Create pose-to-pose educational animations whose visible movement agrees with multiple clinical demonstrations and whose production can be reproduced from files in the target project.

Clinical accuracy outranks realism. Prefer a simplified or exaggerated pose whose movement axis, angle, side, and support points are unambiguous over a realistic image that weakens or misrepresents the maneuver.

## Agent compatibility

This is the shared, tool-neutral skill body for Codex and Claude Code. Follow the workflow using the equivalent web, browser, image, filesystem, and shell capabilities available in the active agent. Do not assume platform-specific tool names, metadata, invocation syntax, or hidden state. Resolve all linked references and scripts relative to this file. Keep agent-specific discovery files outside this directory so the clinical and production rules have one authoritative copy.

## Required workflow

1. Define the maneuver, clinical indication, side, variant, and intended audience. Treat variants with different body or head movements as separate maneuvers.
2. Read [references/research-and-clinical-review.md](references/research-and-clinical-review.md). Find at least three independent procedural videos for each maneuver or variant, preferably from universities, hospitals, professional societies, or clinician-led medical education channels. Record direct URLs, titles, publishers, access dates, and timestamps for every key movement.
3. Resolve disagreements using an authoritative guideline, peer-reviewed article, or institutional procedure. Do not silently combine incompatible variants. Mark unresolved ambiguity as an open issue.
4. Write a structured clinical sequence before generating art: start pose, dominant movement axis, direction, angle, support/contact points, bed orientation, pillow requirement, required body extent, hold, next pose, and return pose. Define these scene requirements separately for every maneuver; sharing a patient rig never implies sharing a bed, pillow, camera, crop, or sitting anchor. Select a camera that makes the dominant movement axis visually unambiguous. Have the domain owner approve this motion specification when the result will be used in clinical education.
5. Read [references/visual-production-and-qa.md](references/visual-production-and-qa.md). Choose the production method before rendering. Prefer a fixed 3D rig when several poses must preserve identity, proportions, joint lengths, camera geometry, and body-to-table registration. Read [references/rigged-3d-workflow.md](references/rigged-3d-workflow.md) when using that route. Use generated raster layers only when those invariants can be held without per-frame repair. Create a separate canonical camera/background for each maneuver whose movement plane differs.
6. Export one lossless PNG for every keyframe and tween frame at fixed canvas dimensions. A rig export may be a fully rendered scene; a layered workflow must use the same background bytes and registered full-canvas RGBA subjects. Use `scripts/build_animation.py` for the layered workflow. Do not use screenshots containing controls, labels, browser chrome, or review overlays as animation frames.
7. After building the actual GIF, make a side-by-side comparison sheet that places every GIF key pose and clinically meaningful transition next to stills captured from each accepted reference at the recorded timestamps. Compare silhouette, body-to-bed relationship, bed orientation, pillow presence, displayed body extent, movement plane, head direction, body-roll direction, contact points, and return pose—not just labels or step order. Log every discrepancy with status `open`, `fixed`, `accepted-variant`, or `pass`.
8. Correct the pose or scene data, rebuild the GIF, regenerate the comparison sheet, and repeat the full reference comparison. Continue until every required row passes every accepted reference or an explicitly documented, domain-owner-approved variant explains the difference. Reviewing an interactive prototype, source code, isolated keyframes, or a storyboard without the encoded GIF does not satisfy this loop.
9. Run `scripts/verify_animation.py` after every rebuild. Do not declare completion while any issue is `open`, fewer than three independent video references are documented, a required pose or transition is absent, the per-maneuver scene specification is violated, or domain-owner sign-off is missing.

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
- Do not call a maneuver complete before the encoded GIF itself has passed the iterative side-by-side reference comparison. A build pass or plausible-looking 3D preview is insufficient.
- The animation may simplify timing, but it must not reverse the side, movement axis, order, or clinically important support position.
- Never rotate, skew, or reposition a completed patient pose merely to make it fit an unrelated bed perspective. Regenerate the pose or redesign the camera/background.
- Reject realistic-looking art when the patient-to-bed contact geometry is wrong. Record where shoulders, occiput, pelvis, and feet contact or leave the support surface.
- For programmatic animation, store fixed bone lengths, named anchors, pose rotations or directions, camera presets, timing, and interpolation rules as data. Interpolate rotations or normalized segment directions and solve joints forward from the root; never linearly interpolate every joint position independently because that shortens bones between keyframes. Verify every encoded frame, including tween frames.
- Use source videos to understand motion, not to reproduce copyrighted frames, branding, audio, or an identifiable person's likeness.
- If reliable sources remain contradictory, or five focused correction cycles fail to resolve the same pose, stop and request domain-owner direction instead of approving the asset.
- Preserve every comparison cycle and issue resolution in `review/` so repeated mistakes are visible to later runs of the skill.
- Label the result as an educational illustration and preserve maneuver, side, and variant metadata wherever it is displayed.
