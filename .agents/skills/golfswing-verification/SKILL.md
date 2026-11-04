---
name: golfswing-verification
description: Verify GolfSwing changes involving video decoding, pose inference, swing measurements or the browser/cloud boundary. Use for implementation checks and regression investigations.
---

# GolfSwing verification

Read the accepted decisions and architecture in docs/ before selecting checks. Inspect the actual implementation and available scripts; the foundation alone has no application tests.

- For video input, check supported clips, invalid input, rotation, timestamps and cancellation. Preserve the distinction between capture frame rate and playback timing, particularly for slow-motion video.
- For pose inference, check confidence handling, missing landmarks, progress, cancellation and responsiveness. Record model version, input resolution and sampling strategy when comparing results.
- For measurements, test known geometry, degenerate points and missing data. Keep camera-specific projected measurements distinct from validated physical measurements; never turn missing data into a zero-valued measurement.
- For cloud integration, verify the agreed upload boundary, authorization, failure/retry behavior and deletion/retention behavior that actually exists. Do not upload personal clips as a side effect of testing.
- For UI changes, verify touch use, narrow screens and overlay alignment with video orientation and aspect ratio. Desktop browser checks do not replace real iPhone Safari testing.
- Use synthetic landmarks and non-private fixtures for committed tests. Keep personal video and derived outputs under ignored local-data/.

Run only checks appropriate to the change. Report exact commands and outcomes, distinguish desktop checks from device observations, and state any unverified boundary. A successful build does not establish usable tracking or accurate biomechanics.
