# GolfSwing

Mobile-first golf swing analysis for iPhone Safari. A local-first analyzer prototype, with cloud fallback planned only after device tests show a need.

## Implemented

- Select an MP4 or MOV from the device, up to 20 seconds and 150 MB. The actual codec must be supported by the browser; an MP4/MOV extension alone does not guarantee decoding.
- Run MediaPipe body tracking in a dedicated browser worker, with progress and cancellation. Video and landmarks are not uploaded.
- Inspect a skeleton overlay, scrub the playback timeline and step between samples. Use Expand to keep the video, lines and playback controls together across the browser viewport, including on iPhone; Close returns to the workbench.
- Locally follow a manually marked clubhead or ball for 0.5–2 playback seconds. Use the magnifier and pixel adjustments to place/correct a point; the tracker stops on a weak or ambiguous match. Inspect trails and export them with the analysis.
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

Start the local development server with:

```powershell
npm.cmd run dev
```

That command serves on port 3000 by default and listens on the local network. It is not a hosted deployment. A phone can use the same-network address, but some browser APIs may require HTTPS; real iPhone verification is still pending.

## Cloudflare static hosting

The production build is a static export in `out/`. Cloudflare serves the interface and MediaPipe assets over HTTPS; all selected-video processing stays in the browser. No account or backend is needed to analyze a clip.

The existing `golfswing` Worker serves static assets. Use production branch `main`, build command `npm run build`, and deploy command `npx wrangler@4.158.0 deploy`. The committed `wrangler.jsonc` explicitly publishes `out/` and prevents automatic Next.js server-adapter setup. Use Node 24 for builds. The build command prepares the pinned model and WASM assets; do not replace it with a bare Next.js command. Only `out/` is published.

`next start` does not support static exports. Use `npm run dev` for local development. See [the hosting decision](docs/decisions/0003-cloudflare-pages.md) for tradeoffs and validation boundaries.

## Measurement limits

Body tracking samples 15 times per playback second and resizes inference frames to at most 640 pixels on the longest edge. Video seeking is browser-controlled, so these are requested sample times, not a guarantee of exact original capture-frame access. Slow-motion playback seconds are not original capture timing. The separate assisted object tracker requests 60 samples per playback second and compares source-resolution crops. It follows appearance, not object identity: blur, rotation, occlusion and fast movement can lose or mislead it. It does not estimate a shaft, clubface angle, spin, ball speed or carry. Precise impact timing and validated 3D biomechanics remain outside this version.

Angles are projected 2D joint angles corrected for video aspect ratio. A straight joint is 180 degrees. Camera position and occlusion affect interpretation; the app does not assign a swing score or coaching judgment. Detection coverage indicates whether a body was found, not whether its pose is accurate.

## Project context

- [Working instructions](AGENTS.md)
- [Architecture](docs/architecture.md)
- [Hybrid direction](docs/decisions/0001-hybrid-processing.md)
- [Browser-first implementation and local-only scope](docs/decisions/0002-browser-first-prototype.md)
- [Skills and tools](docs/tooling.md)
- [Third-party notices](docs/third-party.md)

The agent implements the app; meaningful architecture choices are discussed with the user first. Personal context stays outside this public repository.

See [overlay verification](docs/iphone-overlay-verification.md) for browser checks and pending device testing, and [backend feedback research](docs/backend-feedback-proposal.md) for retrieved datasets and proposed next steps.

See [local club and ball tracking](docs/decisions/0004-assisted-object-tracking.md) for the accepted scope, correction behavior and [verification evidence](docs/object-tracking-verification.md). JSON exports now use version 2 and include `objectTracking.tracks` even without body analysis; each point has a playback timestamp, normalized coordinates, manual/tracked/lost provenance and an appearance similarity (not a probability).
