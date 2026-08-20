# Vertigo Maneuver Asset Review

## Revision 2026-08-20

- Epley frame 04 cervical anatomy was reconstructed to match frame 03 neck length, width, shoulder attachment, and extension, with rotation but no lateral bending.
- Right Epley now ends in edge sitting on the screen-right long edge, with both legs hanging off the right side after rising from left side-lying; the left asset is its exact mirror.
- Right Epley frame 05 was compared at 0:47-0:54 with the Michigan Medicine Right Epley video. The final fixed-camera mapping places the chest/face toward screen-right and the back toward screen-left for true left side-lying, while the shoulder pillow remains visible at the head end.
- The right Epley patient layer is anchored 48 pixels toward the screen-right bed edge from the first frame onward, so the final edge-sitting pelvis reaches that edge and both lower legs clear the mattress. The left sequence mirrors this placement.
- Right Epley frame 06 keeps the torso and legs directed toward the screen-right bed edge while the head remains turned toward screen-left in continuity with frame 05.
- All exported frames now receive a restrained RGB-only focus correction; alpha geometry and frame registration remain unchanged.
- Dix-Hallpike frame 03 was revised so the pillow supports the upper shoulders only and the occiput hangs visibly below the support with approximately 20 to 25 degrees of extension.
- Epley frames 03 and 04 received the same more visible shoulder-supported head-hanging position while retaining their opposite 45-degree yaw directions.
- Epley frame 05 was horizontally reversed in the right-side master; the left-side frame was regenerated as its exact mirror.

## Coordinate convention

- Every animation uses one locked camera within the maneuver.
- Right-side masters are reviewed first.
- In frontal and foot-end views, patient anatomical right appears on screen-left.
- Left-side assets are exact horizontal mirrors of the reviewed right-side assets.
- Holds are encoded as GIF frame durations, not duplicate generated poses.

## Clinical references

- Dix-Hallpike: Interacoustics description of 45-degree yaw maintained during rapid supine positioning with approximately 20-degree neck extension: https://www.interacoustics.com/balance-testing-equipment/visualeyes/support/dix-hallpike-test
- Dix-Hallpike: AAFP/AAO-HNS figure and description of right-ear-down positioning, 45-degree right yaw, and approximately 20-degree neck extension: https://www.aafp.org/assets/image/upload/v1771245694/Migrated%20-%20PDFs%20%28AEM%29/Patient%20Care/clinical_recommendations/RecToBOD-020810-Attachment1BPPV-Jan2010Cluster-pdf.pdf
- Right Epley: AMA/JAMA Neurology sequence: 45 degrees right, supine, 90 degrees left, whole-body roll left with nose toward floor, sit with head still 45 degrees left: https://edhub.ama-assn.org/jn-learning/video-player/18794333
- Epley video comparison: Stanford Dizziness Clinic / University of Michigan right and left Epley videos: https://med.stanford.edu/ohns/OHNS-healthcare/earinstitute/our-services/dizziness-clinic/BPPV-Videos.html
- Gufoni geotropic and apogeotropic sequence descriptions and figures: https://pmc.ncbi.nlm.nih.gov/articles/PMC5052860/
- Gufoni geotropic review: unaffected side down followed by 45-degree nose-down head turn: https://pmc.ncbi.nlm.nih.gov/articles/PMC6002633/
- Modified Gufoni/Appiani apogeotropic review: affected side down followed by 45-degree nose-up head turn: https://pmc.ncbi.nlm.nih.gov/articles/PMC7522363/

## Frame review

### Right posterior Dix-Hallpike

- PASS: neutral seated start.
- PASS: head turns 45 degrees toward patient right (screen-left), not full profile.
- PASS: the same rightward yaw is retained in supine position.
- PASS: approximately 20-degree neck extension with slight chin elevation and supported occiput.
- PASS: return to seated before neutral reset.

### Right posterior Epley

- PASS: seated 45-degree rightward yaw.
- PASS: supine position retains rightward yaw and neck extension.
- PASS: head turns 90 degrees across midline to finish 45 degrees left while body remains supine.
- PASS: body log-rolls onto patient left with legs aligned; nose turns down toward mattress.
- PASS: patient sits while head remains 45 degrees left, then returns neutral.

### Right horizontal Gufoni, geotropic

- PASS: patient moves onto unaffected left side.
- PASS: body remains left side-lying while head alone turns 45 degrees nose-down.
- PASS: returns upright neutral.

### Right horizontal modified Gufoni/Appiani, apogeotropic

- PASS: patient moves onto affected right side.
- PASS: body remains right side-lying while head alone turns 45 degrees nose-up.
- PASS: returns upright neutral.

## Output review

- PASS: all PNG keyframes are RGBA with transparent pixels.
- PASS: all GIFs contain a transparent palette index, finite frame durations, and infinite loop metadata.
- PASS: all frames within each GIF have identical dimensions.
- PASS: every left keyframe is a pixel-exact horizontal mirror of its right counterpart.

These assets are educational illustrations. Clinical deployment should retain maneuver/side/variant labels in application metadata and receive domain-owner sign-off.
