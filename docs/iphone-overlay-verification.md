# iPhone overlay verification

Date: 2026-11-07. This change replaces native video controls with page controls and an Expand/Close view. The video, skeleton and transport remain in the same DOM container. Expanded mode fills the browser viewport; iPhone browser chrome may remain visible. Video and SVG both use centered contain sizing. No model, sampling rate, inference resolution or upload behavior changed.

Presented video timestamps drive the overlay when requestVideoFrameCallback exists. Older browsers use animation-frame updates. Paused inspection retains requested seek times to match the stored sample timestamps; decoded frames can differ from those requested times. Seeks hide the old skeleton until the video settles; missing/uncertain detections remain gaps.

Automated checks: npm.cmd test (10 passing tests, including frame-clock selection and callback cleanup), npm.cmd run typecheck, npm.cmd run build. Formatting and diff checks are run before release.

Desktop browser checks are recorded below as performed. They do not establish iPhone Safari compatibility or biomechanical accuracy.

- Synthetic H.264 test pattern: 360 x 640, 30 fps, 3 seconds. Open, play, end, expand, rotate viewport between 390 x 844 and 844 x 390, and Escape/return focus checked in the Codex desktop Chromium browser.
- Public MediaPipe pose.jpg turned into a static H.264 test clip: 1000 x 668, 30 fps, 3 seconds. The current CPU Lite worker detected all 45 requested samples in 18.98 seconds on this desktop run. This is a pipeline/overlay fixture, not evidence about golf tracking accuracy or iPhone speed.
- All local fixture files remain in ignored local-data/. Public image source: https://storage.googleapis.com/mediapipe-assets/pose.jpg, used by the upstream MediaPipe pose-landmarker tests.

Hardware follow-up: on the target iPhone record model, iOS/Safari version, clip dimensions/orientation/codec and slow-motion timing. Verify visible lines in Expand, portrait/landscape rotation, Play/Pause, scrub/sample controls, Skeleton toggle, Close, processing cancellation and invalid/unsupported clips. Compare overlay landmarks at address, top and impact against annotated frames. Do not infer accurate 3D joint motion, physical head travel or ball-flight quantities from the current projected skeleton.

Detected overlay verification: 18 skeleton connections remained visible and aligned in the expanded 844 x 390 and 390 x 844 viewports. Skeleton off/on removed/restored the SVG. Sample stepping was checked and adjusted to retain requested seek timestamps while paused. No real iPhone hardware was available.
