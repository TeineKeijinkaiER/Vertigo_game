# App integration

Read this after the maneuver is clinically and technically ready to render, before adding it to an application.

## Discover the existing contract

Inspect the app before choosing files or changing a viewer. Identify the component that displays maneuver media, the typed data or content record that selects it, the public-asset path convention, deployment base-path handling, and the tests that encode playback timing. Extend that contract instead of adding a parallel, unconnected gallery or prototype route.

Record in the maneuver's `integration.md`:

- consumer component and content/data ID;
- delivery mode (runtime 3D, frame sequence, video, or GIF) and reason;
- emitted filenames, dimensions, duration, and cache behavior;
- label/caption, maneuver, side, variant, and any completion-timing contract;
- commands run and the observed app route or screen.

## Integrate deliberately

- Add the animation only after its motion specification and review record agree. The UI must show a readable educational label, including side and variant where relevant.
- Keep left/right as explicit content metadata. A visual mirror requires an independently reviewed opposite-side result; update the label, direction indicators, and clinical interpretation together.
- For a sequence, make frame order and dwell duration data rather than timing embedded only in UI code. Reuse the app's preload, replay, and reduced-motion behavior where it has one.
- For runtime 3D, mount and unmount the renderer safely, size it responsively, and prevent hidden or paused scenes from consuming animation frames. Give the app an acceptable fallback when WebGL or required assets are unavailable.
- Put final static assets in the app's established asset location. Preserve transparent alpha when the game background is part of the composition. Use deployment-safe URLs rather than assuming the app is hosted at the domain root.
- Keep source videos and review-only captures outside the shipped media bundle unless their license and product need explicitly permit inclusion.

## This repository

The current app uses the `ManeuverFilm` component with a typed `FilmId`, `src/data/poseFilms.json`, and assets under `public/poses/films/`. Add or change those contracts together and run `scripts/verify_pose_films.py`; it also checks the consumer manifest, every emitted frame, and left/right pairs. The component builds asset URLs with `import.meta.env.BASE_URL`, which must be preserved for GitHub Pages deployment. If the app changes from sequences to runtime 3D, add focused mount/unmount, timing, and fallback tests rather than weakening the current film checks.

## Verify in the application

1. Open the actual screen that consumes the maneuver on a representative narrow viewport and confirm the full motion, caption, and controls are usable.
2. Confirm the expected duration or pose-reached timing used by downstream learning/scoring logic still matches the delivered frames.
3. Run the rig or render verifier, the consumer's unit tests, and the production build. If an unrelated pre-existing failure prevents a full suite, report it separately and still run the narrowest relevant verification available.
4. Inspect the production output or service-worker manifest when the app caches assets offline. Ensure each individual media file is within configured cache limits or intentionally excluded with a usable online fallback.
