# Skills, tools and references

## Repository skills

These instructions are available in any checkout under .agents/skills/:

| Skill | Purpose | Origin |
| --- | --- | --- |
| [ponytail](../.agents/skills/ponytail/SKILL.md) | Minimal complete code changes and dependency choices | Ponytail 5.3.3, unchanged |
| [ponytail-review](../.agents/skills/ponytail-review/SKILL.md) | Review a change in its surrounding code | Ponytail 5.3.3, unchanged |
| [golfswing-verification](../.agents/skills/golfswing-verification/SKILL.md) | Video, inference, measurement and device verification | Authored for this repository |

Ponytail source: https://github.com/DietrichGebert/ponytail, version 5.3.3, copied from the installed distribution on 2026-11-04. Each copied skill includes the upstream MIT license and copyright notice. Only the two instruction files and their licenses are bundled; no plugin hooks or executable installer are included. Repository copies take precedence over duplicate personal installations. Review upstream changes before updating these copies.

## Optional tools

Use connected GitHub and Vercel tools where available. Apply a relevant React/Next.js guide for UI changes, Vercel deployment/verification guidance when deploying, and Supabase guidance only if that service enters scope. These optional integrations require their own installation and account access; the repository grants neither. Avoid overlapping skill packs.

Shared conventions: concise context, focused branches, meaningful checks, recorded decisions and separate reporting of local, pushed and deployed states. Personal notes and service credentials remain outside the repository.

## Reference repositories

- [MediaPipe](https://github.com/google-ai-edge/mediapipe): official inference implementation and API source.
- [MediaPipe web samples](https://github.com/google-ai-edge/mediapipe-samples-web): official browser examples for investigating pose inference and worker integration.

Repository pages checked on 2026-11-04 identify Apache-2.0 licenses. Check exact code and model licenses before incorporation and preserve required notices. These references do not establish accurate golf biomechanics.

Place useful local reference checkouts under ignored .references/<repository>/. Record upstream commits when relying on them and inspect scripts before execution. Neither reference repository is bundled or installed here.
