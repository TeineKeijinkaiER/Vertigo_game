# Fixed 3D maneuver rig prototype

Status: technical prototype, clinical review required. This is not connected to the
game's maneuver assets.

## Scope

The interactive prototype now represents right Dix-Hallpike, right posterior-canal
Epley, right geotropic Gufoni, right apogeotropic Gufoni-Appiani, and the bilateral
Supine Head Roll diagnostic sequence. It includes key-pose controls, fixed-bone
interpolation, two review cameras, automatic playback, and a skeleton overlay. It is
not yet an approved clinical GIF.

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
- Every transition reconstructs child joints from normalized segment directions and
  immutable segment lengths; joints are not independently linearly interpolated.
- The same patient identity, facial coordinates, clothing palette, bed, lighting, and
  camera presets are reused for every included maneuver.

## Included sequence geometry

- Epley: right-yaw sitting, right Dix-Hallpike, head-only turn across midline, left
  body log roll with nose down, and side-facing rise.
- Gufoni geotropic: bed-edge sitting, fall toward the unaffected left side, then a
  head-only nose-down turn.
- Gufoni-Appiani apogeotropic: bed-edge sitting, fall toward the affected right side,
  then a nose-up turn. This is kept separate because published naming and technique
  vary.
- Supine Head Roll: approximately 30-degree head flexion, right 90-degree turn,
  neutral reset, and left 90-degree turn.

## Scene-specific corrections

- Dix-Hallpike now contains only the clinically relevant right-45-degree seated and
  right-45-degree hanging poses; playback returns between them without inserting a
  front-facing seated pose.
- Epley left log roll places the anatomical left shoulder below the right shoulder.
  The return pose sits at the long side of the bed with the legs lowered over the
  side edge while the head remains turned left.
- Gufoni and Gufoni-Appiani use a transverse scene whose bed long axis follows the
  visible left-right fall direction. Neither scene contains a pillow.
- Supine Head Roll uses no pillow and renders only the upper-body rig so head yaw is
  shown at a useful scale.
- The patient head-to-body ratio was increased and the face retained large eyes and
  rounded boyish proportions. Geometry and facial features remain head-local.

Additional written sources:

- AAO-HNSF BPPV guideline and Supine Head Roll description:
  https://www.entnet.org/quality-practice/quality-products/clinical-practice-guidelines/bppv/
- APTA Roll Test summary (supine, 90 degrees right and left):
  https://www.apta.org/patient-care/evidence-based-practice-resources/test-measures/roll-test-for-benign-paroxysmal-positional-vertigo-bppv
- Review of diagnostic tests and repositioning maneuvers:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9411440/
- Prospective trial describing Gufoni/Appiani head-down and head-up variants:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8356861/

## Open clinical review

- Confirm that the final head extension target should remain the project-requested
  approximately 45 degrees for this shoulder-pillow variant rather than 20-30 degrees.
- Confirm the visible screen direction of right yaw in the foot-end camera.
- Confirm shoulder, occiput, pelvis, and heel contact in both camera presets.
- Confirm Epley transition 3 is head-only and transition 4 is a whole-body log roll.
- Confirm right-side Gufoni fall direction separately for geotropic and apogeotropic
  variants, and approve the chosen Appiani nose-up convention.
- Confirm Supine Head Roll uses 30-degree flexion and 90-degree turns in the intended
  teaching setup, including observation holds at center and on each side.
- A clinician/examiner model and hand support are not included in this first patient-rig prototype.
- Final GIF export must hide the skeleton, red direction arrow, controls, and labels;
  those remain review aids only.
