# Browser-first prototype

Date: 2026-11-06. Status: accepted scope and visual direction; device performance unverified.

## User decisions

- Start with browser analysis and add cloud fallback based on real test results.
- Use a light, minimal coaching-tool interface with green accents.
- Build in the repository only. Do not launch a server or deploy anything yet.

## Alternatives discussed

| Path | Advantage | Cost |
| --- | --- | --- |
| Browser first; cloud fallback later — selected | Tests the on-device experience with minimal infrastructure and no video upload | Device limits may require a later second processing path |
| Browser preview plus cloud reanalysis immediately | Access to additional models and processing resources | Upload policy, backend jobs, storage and costs before the local limitations are measured |
| Browser poses plus cloud landmark analysis | Smaller transfers and original video can stay local | Cloud cannot recover missed body landmarks without images |

The light visual direction was selected over a dark video workspace. Video itself remains on a dark surface for contrast; the surrounding controls use the selected light design.

## Implementation baseline

A single Next.js application serves the interface and model assets. A dedicated worker runs MediaPipe Lite on CPU, keeping synchronous inference off the interface thread. Sequential sampling limits the number of decoded frames and inference requests in flight. This baseline is reversible: compare model size, CPU/GPU delegation and sampling settings using measured device behavior before expanding infrastructure.

Initial limits are 20-second clips, 150 MB, 15 requested samples per playback second and a 640-pixel inference frame limit. These are prototype bounds, not proven optimal settings. Browser seeking is not guaranteed frame-exact; original capture timing is not inferred from slow-motion playback.

Pure measurement functions are separated from the browser pipeline. No speculative cloud provider interface, upload endpoint, queue or database is implemented.

## Evidence and remaining checks

Unit tests cover aspect-ratio-corrected angles, missing/uncertain joints, sampling bounds, overlay sample matching and marker ordering. Type checks and the production compilation run without launching a server.

Real MP4/MOV decoding, worker inference, visual layout and performance still need browser/device testing when launching is authorized. Desktop compilation is not evidence of iPhone compatibility or accurate swing tracking.
