# Fixed 3D Rig Workflow

Use this route when a maneuver needs more than a few poses, when body roll must be distinguished from head-only motion, or when generated patient images cannot preserve registration.

## Scene and coordinate contract

Define one patient-local right-handed coordinate system before posing. Record which world axis is gravity, the table long axis, table width, and patient anatomical right. For each camera preset, explicitly map anatomical right/left to screen direction. Never infer screen direction from a maneuver name.

Keep these values immutable across the patient asset family:

- skeleton topology and segment lengths;
- head dimensions and head-local facial feature coordinates;
- patient identity, clothing, materials, and scale;
- render resolution and patient scale.

Define table dimensions and orientation, mattress, pillow/supports, sitting edge, camera preset, and full-body versus partial-body display per maneuver. Lock those values only within that maneuver. Do not reuse a longitudinal bed scene for a lateral-fall maneuver, add a pillow to a test that does not require one, or keep a full-body crop when an upper-body view communicates the tested motion more accurately.

The visual mesh may be stylized and rounded, but it must remain a child of the validated rig. Do not pose decorative meshes independently from their joints.

## Pose data

Store each clinical key pose as data rather than a separately modeled patient. At minimum record:

- maneuver, side, and named variant;
- root/pelvis position;
- body axis and shoulder-width axis;
- head forward and up vectors;
- limb segment directions or joint rotations;
- table contacts and support contacts;
- bed orientation, pillow requirement, and displayed body extent;
- expected anatomical and screen direction of the nose;
- hold duration and source timestamps supporting the pose.

Use separate pose sequences for variants such as geotropic Gufoni, apogeotropic Gufoni–Appiani, and the diagnostic Supine Head Roll test. A label change is not a variant implementation.

## Interpolation

Interpolate rotations with quaternion slerp, or interpolate unit segment directions and renormalize before forward-kinematic reconstruction. Recompute every child joint from its parent and the immutable segment length. Avoid independent Cartesian interpolation of all joints. Use ease-in/ease-out timing only after the visible direction and clinical order are approved.

Clinically meaningful observation periods should be encoded as GIF frame durations. They do not require duplicated bitmaps. Keep motion readable; cinematic secondary motion must not obscure the head angle or contact point.

## Rendering and export

Render at the final aspect ratio, preferably at least 768 × 512. Use a transparent subject pass plus a fixed background when practical. A fully rendered scene is acceptable when the same code, scene graph, camera, and environment are used for every frame and their fixed state is recorded.

Export frames without the authoring UI, skeleton overlay, direction arrow, captions, or browser chrome. Those aids belong in review renders. Preserve a review storyboard that adds pose labels and direction markers outside the final animation.

For the opposite side, mirror only when the room, clothing, and all relevant geometry are bilaterally symmetric and every anatomical/screen direction is updated. Otherwise solve and render the opposite-side pose explicitly.

## Required automated checks

Check every exported frame, not only key poses:

- exact canvas dimensions and frame count;
- constant root anchor when the pose specification requires it;
- segment-length deviation within the declared floating-point tolerance;
- constant head dimensions and patient scale;
- fixed camera, support, and scene hashes or serialized values;
- expected nose direction for every directional pose;
- GIF timing, loop behavior, and frame order;
- exact mirror relationship when mirroring is claimed.

Automated geometry does not establish clinical correctness. Keep technical status and domain-owner clinical status separate.

After encoding the GIF, compare its frames side by side with the timestamped reference stills. Any correction requires rebuilding and rechecking the complete GIF, including unchanged-looking poses and tweens. Do not approve from the interactive rig alone.
