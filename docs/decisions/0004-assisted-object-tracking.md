# Assisted local clubhead and ball tracking

Date: 2026-11-07. Status: accepted first slice; iPhone performance and real-swing accuracy unverified.

## Decision

After discussing local feasibility, the user accepted a local assisted prototype: mark the ball or clubhead, follow a short interval, inspect the trail and correct lost/drifting points. Video remains in the browser. This does not select a cloud runtime or upload policy.

The earlier recommendation compared a lighter assisted tracker with fully automatic learned detection. Assisted tracking needs a manual start and corrections but can be tested without training data or model downloads. Automatic detection may recover from appearance changes better, but requires an appropriate licensed model, data and measured iPhone performance. The UI and normalized point format can remain if a learned detector is justified later.

## Implemented scope

- Separate clubhead and ball tracks; no inferred shaft or clubface direction.
- Tap/drag within the actual video image, including expanded view. Letterboxed bars are excluded. A source-image magnifier, small/medium/large patch sizes and one-pixel buttons support precise placement and keyboard use.
- Follow 0.5, 1 or 2 playback seconds, requesting 60 samples per second. These are browser seeks, not guaranteed distinct capture frames. Slow-motion capture speed is not inferred.
- Decode sequentially, crop at source resolution, compare grayscale patches in a dedicated worker. A fixed 13×13 sampled template searches a bounded crop around the predicted position, with coarse and local fine search. Prediction is only a search aid; it is never emitted as a detection.
- Normalized correlation must reach 0.72 with an 0.08 margin over spatially separate alternatives. A low-texture seed errors; a weak/ambiguous match emits a null `lost` sample and stops. Thresholds are prototype heuristics, not calibrated probabilities or proven accuracy.
- Translation-only appearance matching will fail or drift on rotation, blur, occlusion, rapid motion and similar scenery. A static patch may match background if the user selected it. Inspect/correct results; an accepted match is not proof of object identity.
- A correction removes all later points for that target, including later manual points. Earlier points and the other target remain. The UI explains this before saving. Cancellation/failure preserves prior tracks; completed intervals replace their dependent future. No trail connects across missing samples, gaps or new manual anchors.
- Export schema version 2 retains available pose fields and adds `objectTracking` with separate tracks, playback times, normalized image coordinates, patch radius, provenance and similarity. Export also works without a body run. Replacement video clears both tracks and poses; there is no persistence beyond session/export.

## Validation experiment and next decision

Use synthetic moving targets first to establish motion, disappearance, ambiguity, correction, cancellation and coordinate behavior. Then test face-on and down-the-line slow-motion swings on the target iPhone. Record device/iOS, resolution, codec, capture and playback timing, interval, manually annotated position error, lost/drifting frames, processing time, responsiveness and memory/heat observations. Real clubhead/ball accuracy is not established by synthetic tests. Do not claim launch-monitor measurements or automatic coaching from these points.

Retain the simple local path until those observations justify a trained tracker. No external dataset or model was added for this slice.
