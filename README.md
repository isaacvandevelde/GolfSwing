# GolfSwing

Mobile-first golf swing analysis for iPhone Safari. A local-first analyzer prototype, with cloud fallback planned only after device tests show a need.

## Implemented

- Select an MP4 or MOV from the device, up to 20 seconds and 150 MB. The actual codec must be supported by the browser; an MP4/MOV extension alone does not guarantee decoding.
- Run MediaPipe body tracking in a dedicated browser worker, with progress and cancellation. Video and landmarks are not uploaded.
- Inspect a skeleton overlay, scrub the playback timeline and step between samples.
- Plot left/right elbow and knee angles, with missing or uncertain measurements shown as gaps.
- Inspect head displacement relative to the manual Address marker, in percent of video height, using the nose as a 2D proxy. Camera movement and head rotation affect this measurement; it is not a physical distance.
- Set address, top and impact markers manually, and save timestamped landmarks, metadata and markers as JSON.
- Compact dark analysis workbench: video, cyan/pink pose overlay, signal chart, pipeline readouts and raw landmark inspection.

Results stay in the current session unless exported. There is no account, database, cloud inference or saved swing history.

## Local setup

Requires Node 22.18+ or Node 24. On Windows, from the repository directory:

```powershell
npm.cmd ci
npm.cmd run prepare:assets
npm.cmd test
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run build
```

Installation/preparation copies the pinned MediaPipe runtime and downloads the pinned Lite model from Google, checking its SHA-256 hash. The generated assets live in ignored public/mediapipe/. Runtime analysis loads them from the same origin as the app, without sending the selected video elsewhere.

Local execution is authorized. Nothing has been deployed. Start the development server with:

```powershell
npm.cmd run dev
```

That command serves on port 3000 by default and listens on the local network. It is not a hosted deployment. A phone can use the same-network address, but some browser APIs may require HTTPS; real iPhone verification is still pending.

## Measurement limits

The prototype samples 15 times per playback second and resizes inference frames to at most 640 pixels on the longest edge. Video seeking is browser-controlled, so these are requested sample times, not a guarantee of exact original capture-frame access. Slow-motion playback seconds are not original capture timing. Precise impact timing, club tracking and validated 3D biomechanics are outside this version.

Angles are projected 2D joint angles corrected for video aspect ratio. A straight joint is 180 degrees. Camera position and occlusion affect interpretation; the app does not assign a swing score or coaching judgment. Detection coverage indicates whether a body was found, not whether its pose is accurate.

## Project context

- [Working instructions](AGENTS.md)
- [Architecture](docs/architecture.md)
- [Hybrid direction](docs/decisions/0001-hybrid-processing.md)
- [Browser-first implementation and local-only scope](docs/decisions/0002-browser-first-prototype.md)
- [Skills and tools](docs/tooling.md)
- [Third-party notices](docs/third-party.md)

The agent implements the app; meaningful architecture choices are discussed with the user first. Personal context stays outside this public repository.
