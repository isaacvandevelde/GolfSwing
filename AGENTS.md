# GolfSwing agent instructions

Read README.md, docs/architecture.md, docs/tooling.md and the relevant docs/decisions/ before changes. This repository is the source of truth for code and shared technical decisions.

## Working and learning method

- Apply Ponytail for coding: the smallest complete change, existing patterns before new dependencies, no speculative abstractions or unrelated refactors.
- Before a material architecture choice, explain the problem, realistic options, pros/cons, relevant context, recommendation, reversibility and a useful validation experiment. Let the user choose before implementing the dependent architecture.
- Routine reversible implementation details can proceed autonomously within agreed scope. Record accepted material decisions in docs/decisions/; label proposals and unanswered questions explicitly.
- Build the analyzer before AI coaching. Hybrid is accepted; the cloud provider, worker technology, upload policy, storage and exact division of processing are not.
- Use Windows-compatible instructions. Prefer npm.cmd when npm is selected; document only commands that exist and have been verified. Do not assume a Mac or iOS simulator.

## Skills and tools

- Read .agents/skills/ponytail/SKILL.md for coding, .agents/skills/ponytail-review/SKILL.md for requested reviews, and .agents/skills/golfswing-verification/SKILL.md for relevant implementation checks. Prefer these repository copies over duplicate personal installations.
- Use one relevant React/Next.js guide, Vercel deployment/verification skills for their respective tasks, and Supabase skills only if that service enters scope. See docs/tooling.md.
- Prefer connected GitHub/Vercel tools when sufficient; use local Git for the working tree. Inspect the actual tool availability before choosing a fallback.
- Reuse patterns from other projects selectively. Do not import their credentials, service IDs, production permissions, business logic or full skill collections.
- New shared skills belong in .agents/skills/<name>/SKILL.md. Read external skills before installing, record source and version, and avoid duplicate instructions. Personal plugin installations are not repository dependencies.

## Local-only work

- The user requested repository-only development on 2026-11-06. Do not start servers, open running previews, deploy or change hosting until explicitly requested. Builds, type checks and automated tests are allowed.

## Git and release discipline

- Expected origin: https://github.com/isaacvandevelde/GolfSwing.git. Inspect branch, status, remote and upstream before editing; preserve unrelated changes.
- After the initial foundation, use focused feature branches based on up-to-date main. An empty repository has no remote main to pull yet.
- Commit only reviewed task files with descriptive messages. Do not force-push or discard another contribution. Keep local, committed, pushed, merged and deployed status distinct.
- Do not infer release authorization or deployment targets from another project. No Vercel project or cloud processing environment has been provisioned here.
- Keep live work items in GitHub Issues when remote coordination is needed; do not create duplicate task ledgers in Brain.

## Data and verification

- Never commit credentials, private swing videos, personal analysis outputs or Brain exports. Use local-data/ for private test material; .gitignore is a backstop, not a privacy policy.
- Do not upload videos or landmarks just because hybrid processing was chosen. Agree the data flow and upload behavior before implementing it.
- Keep inference, measurement calculations and presentation separable without creating extra services or generic frameworks ahead of need.
- Test meaningful calculation and failure behavior. For UI work, check responsive layout, touch controls, progress, cancellation and errors. Run only checks relevant to the change.
- A desktop browser or WebKit test does not prove iPhone Safari compatibility. Record device, OS, clip properties and observed results when testing on hardware; never claim device testing without evidence.
- Run the applicable existing checks and inspect the diff before committing. Documentation-only changes need link/content and whitespace checks, not invented application tests.
