# Hybrid processing

Status: accepted direction; implementation boundary pending.
Date: 2026-11-04.

## Decision and context

The user selected hybrid after comparing browser, server and hybrid processing. The application must be accessible from iPhone Safari without a running personal computer. Retain client-side MediaPipe tracking and browser analysis as the starting preference, with room for complementary cloud processing.

Hybrid offers flexibility but adds two execution environments and data-transfer concerns. It does not mean every video must be uploaded or that both paths must be built in the first experiment.

## Alternatives

| Direction | Benefit | Tradeoff |
| --- | --- | --- |
| Browser only | Video can stay on-device; no server inference service | Device and browser limits constrain processing |
| Server only | Centralized processing resources and model choices | Upload delay, processing costs and private-video handling |
| Hybrid, selected | Browser analysis plus targeted cloud capabilities | More boundaries, failure modes and maintenance |

## Next discussion

| Proposed division | Benefit | Tradeoff |
| --- | --- | --- |
| Browser extracts landmarks; server processes selected derived data | Smaller transfers; original video can stay local | Server cannot correct missed poses without frames; landmarks remain personal data |
| Browser offers preview; server reanalyzes an explicitly uploaded clip | Server can use a different model and revisit frames | Larger uploads, retention decisions and processing infrastructure |
| Browser is primary; server is an explicit fallback | Cloud use can be limited to cases that need it | Two paths require consistent results and clear failure handling |

These options may coexist later; none of these divisions is accepted yet. Compare them using real tracking failures and device measurements. Do not select a backend, queue, database or upload policy implicitly while scaffolding.

Initial proposed experiment: video selection, timestamped landmarks and overlay on iPhone 15. Measure processing time, responsiveness and tracking failures before adding infrastructure.
