# Architecture

Status: browser analyzer implemented locally. No server has been launched and no cloud services have been provisioned. See [the browser-first decision](decisions/0002-browser-first-prototype.md).

## Accepted decisions

- Mobile-first web application usable in iPhone Safari without a running personal computer.
- Next.js, TypeScript and Tailwind, with Vercel as the intended web host.
- Analyzer before AI coaching.
- Hybrid processing, with client-side MediaPipe tracking and browser-side analysis as the starting preference.
- Supabase remains optional; no database, authentication system or cloud worker has been selected.

See [the decision record](decisions/0001-hybrid-processing.md) for alternatives and tradeoffs.

## Responsibilities

The application separates browser video processing (`src/browser/analyze-video.ts` and `public/pose-worker.js`), measurement functions (`src/domain/analysis.ts`) and React presentation (`src/ui/swing-studio.tsx`). These are modules in one app, not separate services.

```mermaid
flowchart LR
    V[Selected video] --> F[Frame extraction and timestamps]
    F --> P[Browser pose inference]
    P --> L[Landmarks and confidence]
    L --> M[Measurement calculations]
    M --> U[Timeline and charts]
    V --> O[Video with skeleton overlay]
    L --> O
    L -. Agreed upload boundary required .-> C[Optional cloud processing]
    V -. Explicit clip upload if selected .-> C
    C -. Results contract to be defined .-> U
```

The dotted cloud paths are alternatives under discussion, not implemented or authorized automatic uploads. Serving the website from Vercel does not require running video inference there. A cloud inference service, if needed, will require its own runtime evaluation.

The browser pipeline should retain timestamps, landmarks and confidence alongside visual output. Measurements should not depend on React components or a particular inference location. Avoid creating a generic backend abstraction before a second implementation is justified.

## Implemented validation slice

Video selection, pose extraction, overlay, scrubber, joint-angle charts and manual phase markers are implemented. Processing time and detection coverage are reported. Real-browser and iPhone verification remains pending because the user requested no launches yet.

Preserve slow-motion timing deliberately. Model-derived coordinates and projected joint angles are estimates; do not describe them as validated 3D biomechanics or automatically reliable impact detection.

## Pending choices

| Choice | Options to discuss | Evidence needed |
| --- | --- | --- |
| Cloud input | Derived landmarks, uploaded video, or explicit fallback | On-device failures and privacy expectations |
| Frame processing tuning | Current baseline: 15 samples/s, 640-pixel frames, CPU worker | Compare accuracy, time and memory on the target device |
| Persistence beyond this prototype | Session-only with local JSON export now; browser/server history later | History requirements and retention rules |
| Cloud runtime | Select only after identifying the actual workload | Model requirements, execution time, cost and deployment limits |

For each material choice, document pros, cons, recommendation and reversibility, then record the accepted outcome before implementing dependent infrastructure.

## Data and verification

Private videos and derived personal data are not repository fixtures. Use synthetic landmarks in committed tests. Upload behavior, access controls and retention must be agreed before introducing a cloud data path. No secrets belong in client bundles or Git.

Use the [verification skill](../.agents/skills/golfswing-verification/SKILL.md). A desktop test or successful build is not evidence of real iPhone performance.
