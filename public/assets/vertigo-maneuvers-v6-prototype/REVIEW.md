# Dix-Hallpike fixed 3D rig prototype

Status: technical prototype, clinical review required. This is not connected to the
game's maneuver assets.

## Scope

Only the right Dix-Hallpike test is represented. The prototype deliberately stops at
three key poses: seated neutral, seated with right 45-degree head yaw, and the final
shoulder-supported head-hanging position. It is not yet a GIF.

## Reference hierarchy

1. Static clinical figures define the key-pose silhouette and bed relationship.
2. Clinical text defines the intended angles and support points.
3. Videos define the transition direction and timing only after the key poses pass.

References:

- American Family Physician, *Initial Evaluation of Vertigo*, Figure 2: seated start,
  30-45 degree yaw, rapid supine descent, and 20-30 degree head extension.
  https://www.aafp.org/pubs/afp/issues/2006/0115/p244.pdf
- Evidence-Based Practice: Management of Vertigo, Figure 1.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3444821/
- Best practice assessment and management of BPPV in older adults: modified
  Dix-Hallpike with a pillow under the shoulders.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12358047/

The shoulder-pillow setup is treated as a modified setup and is not silently blended
with the table-edge head-hanging setup shown in some references.

## Technical invariants

- One procedural 3D patient is reused for all poses.
- Pelvis world coordinates are identical in all poses.
- Torso, neck, upper-arm, forearm, thigh, and lower-leg lengths are validated at
  module load and must match to floating-point tolerance.
- Head radius, body mesh dimensions, bed, pillow, lighting, and camera presets are
  fixed.
- The red 3D arrow is derived from the same face-direction vector used to orient the
  eyes and nose.
- Eyes, irises, highlights, brows, nose, mouth, and cheeks are children of one
  head-local transform. Their coordinates do not vary by pose.
- The shoulder girdle is defined from an upper-thorax center to left and right
  acromial/shoulder anchors before connecting to the humeri.
- Wrists and ankles are explicit joints. Fingerless hand segments and foot segments
  extend beyond them and retain fixed lengths in every pose.

## Open clinical review

- Confirm that the final head extension target should remain the project-requested
  approximately 45 degrees for this shoulder-pillow variant rather than 20-30 degrees.
- Confirm the visible screen direction of right yaw in the foot-end camera.
- Confirm shoulder, occiput, pelvis, and heel contact in both camera presets.
- A clinician/examiner model and hand support are not included in this first patient-rig prototype.
