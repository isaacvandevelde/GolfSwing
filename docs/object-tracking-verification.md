# Assisted object tracking verification

Date: 2026-11-07. Environment: Windows desktop, Codex in-app Chromium browser. No physical iPhone or iOS Safari was tested.

## Automated checks

- `npm.cmd test`: 16 tests, covering the existing pose/measurement/timing behavior plus translated target matching with brightness changes, disappeared/ambiguous targets, flat/clipped/invalid patches, bounded sampling, portrait/landscape letterboxing, correction invalidation and trail gaps.
- `npm.cmd run typecheck`, `npm.cmd run format:check`, `npm.cmd run build`: all passed. `git diff --check` passed.
- No new dependency, dataset or model. Source crops are processed sequentially in a local worker; no upload path was added.

## Browser evidence

Private fixtures are not committed. A generated, non-personal 480×320 H.264 MP4 contains 3 seconds at 60 playback fps: a white moving disk disappears at 1 second; a moving rectangle continues. The synthetic targets establish mechanics, not real-swing accuracy.

- Ball: manually selected at approximately (80.79, 150.24), followed at 60 requested samples/s. Last tracked x was 110 px; emitted `lost` with null coordinates at 1.000 s, matching the synthetic disappearance. No current ball marker was drawn after loss.
- Clubhead proxy: rectangle followed from 0 to 2 seconds (121 samples including the anchor), with endpoint (299, 166) for a rectangle centered near (299, 165); initial manual mark accounted for the one-pixel vertical offset. Matching remained available at the final sample.
- Cancelled a continuation during processing. Prior tracks and cursor were preserved; retry controls returned.
- Corrected the clubhead at the start using a one-pixel nudge. Its dependent future was removed; the ball track remained. Low-detail background marking produced a clear patch-detail error rather than an automatic track.
- Expanded layout checked at 390×844 and 844×390. Touch-style coordinate selection and pixel adjustment controls worked in desktop simulation. At 844×390, video and overlay shared exactly the same displayed bounds; document width was 844 (no horizontal overflow). Escape returned focus to Expand. The transport/editor scrolls independently to retain access on short screens.
- Export without pose analysis succeeded. The browser automation download event timed out, but the actual downloaded `golfswing-analysis.json` was read from Downloads: schema 2, 480×320 dimensions, one corrected club point, 61 ball entries and null/lost ball at 1.000 s. No pose frames were fabricated. This synthetic export is not committed.
- Replacing the clip cleared both object tracks and disabled export until new results existed. Body regression used the existing 1000×668, 3-second, 30-fps H.264 fixture derived from the public MediaPipe pose image: 45/45 pose samples and 18 skeleton connections remained visible. That static-body fixture does not establish motion accuracy.

## Static production export

Served the final `out/` locally with the development server stopped. The production-bundled module worker loaded and repeated the synthetic ball run, stopping at 1.000 s with a lost/null result. Browser error logs were empty. This confirms the tracker works with the static hosting output, without a Next.js server or remote inference.

## Remaining device experiment

On a real iPhone, test face-on and down-the-line swings, portrait/landscape, ordinary and slow-motion clips (record model, iOS version, codec, dimensions and capture/playback rates). Annotate the actual ball and clubhead centers and measure error, false matches, loss, processing time, cancellation responsiveness, thermal behavior and Safari stability. Test full-resolution HEVC/MOV as well as H.264 MP4. A comparison score is not calibrated confidence, and 60 requested seeks do not guarantee 60 distinct or frame-exact decoded images.

This prototype has no learned golf-object detector, shaft/clubface estimate, ball speed, spin, carry or automatic coaching. Fixed appearance matching is expected to stop or drift on fast motion, rotation, blur and occlusion. Do not turn these experimental tracks into physical performance claims.
