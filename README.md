# GolfSwing

Mobile-first golf swing analysis for iPhone Safari. Build a useful analyzer before adding AI coaching.

## Agreed direction

- Next.js, TypeScript and Tailwind; intended hosting on Vercel.
- Hybrid processing, starting with client-side MediaPipe pose tracking and browser-side measurements. The exact browser/cloud boundary is still open.
- Supabase is an optional later choice, not an installed dependency.
- First device target: iPhone 15 on iOS 26. Repeat device checks after OS upgrades.

## First experiment

Select a short swing video, extract timestamped body landmarks and inspect a skeleton overlay. Measure processing time, responsiveness and tracking failures on the actual iPhone. Then add a scrubber, camera-appropriate measurements and manually selected swing phases.

Keep raw landmarks so measurements can be recalculated. Treat uncertain tracking as uncertain; inferred pose coordinates are not validated biomechanical measurements. Club tracking, automatic segmentation, comparisons and AI coaching come later.

## Current state

Repository foundation only: no application, dependencies, CI or deployed environment yet. There are no build or start commands to run.

- [Working instructions](AGENTS.md)
- [Architecture](docs/architecture.md)
- [Hybrid decision and next architecture discussion](docs/decisions/0001-hybrid-processing.md)
- [Skills, tools and reference repositories](docs/tooling.md)

The agent implements the app. The user learns by comparing material architecture options before choosing them. Code and technical decisions belong here; personal context remains in Brain.
