# Skills, tools and references

## Reused working conventions

Apply the selected conventions documented for Seatin and Theates: concise shared context, focused branches, meaningful checks, recorded decisions and explicit separation of Git and deployment status. GolfSwing has its own product and infrastructure boundaries.

## Available skills to use when relevant

| Skill | Use |
| --- | --- |
| ponytail:ponytail | Coding and dependency choices; minimal complete changes |
| ponytail:ponytail-review | Reviewing a change in its surrounding code |
| vercel:react-best-practices | React checks after editing multiple TSX components |
| vercel:verification | Verify the actual browser-to-data flow when an application exists |
| vercel-deploy and applicable Vercel deployment guidance | Authorized preview/deployment work, with targets verified |
| direct-github-vercel-ops | Investigate actual GitHub Actions or Vercel failures through connectors |
| supabase:supabase | Only when Supabase is selected or evaluated concretely |
| understand-anything skills | Architecture exploration when the codebase is large enough to benefit |

These are existing personal skill installations, not bundled dependencies. Ponytail 5.3.3 was read during setup. Read each other applicable skill at use time. No additional skill packs or libraries were installed for this foundation.

## External repositories

Checked on 2026-11-04:

- [MediaPipe](https://github.com/google-ai-edge/mediapipe): official inference implementation and API reference source.
- [MediaPipe web samples](https://github.com/google-ai-edge/mediapipe-samples-web): official browser examples, useful for investigating pose inference and worker integration.

Both repository pages identify Apache-2.0 licenses. Check the exact file and model licenses before incorporating assets or code, and preserve required notices. These repositories are references, not evidence of accurate golf biomechanics.

If a local checkout becomes useful, place it under .references/<repository>/, which is ignored by GolfSwing Git. Pin and record the upstream commit when relying on it; inspect scripts before running them. Do not clone or install whole projects merely to obtain one example. No reference repositories have been downloaded yet.
