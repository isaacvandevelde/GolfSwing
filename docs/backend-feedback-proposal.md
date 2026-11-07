# Swing feedback and backend options

Status: research/proposal, not an accepted backend architecture. Checked 2026-11-07.

## Data actually retrieved

[CaddieSet](https://github.com/damilab/CaddieSet) publishes a CSV of shot outcomes and extracted pose features. The CSV and repository MIT notice were downloaded to ignored `local-data/`; no dataset or personal video is bundled with the app.

- File: `data/CaddieSet.csv`, Git blob `2a1c04f0f47cf1714bdcfcddf703050c3722a811`.
- SHA-256: `646459b081863e244d75efe6f09fad4d34750d2fed7fde44db654e7720a9a306`.
- Verified: 1,757 rows, 80 columns; every row has 80 fields. 924 face-on and 833 down-the-line shots.
- Eight golfers, with 235, 330, 460, 135, 352, 142, 13 and 90 rows respectively. 1,137 rows use a driver; other clubs have fewer examples.
- The first 11 columns (view, club, ball outcomes, golfer ID) have no blank cells. Pose-feature availability varies strongly: `1-HIP-LINE` is blank in 1,094 rows. View-specific features and failed/missing observations must be distinguished; never replace blanks with zero.
- Outcomes include carry, ball speed, direction and spin. These are reference launch-monitor measurements, not quantities our phone skeleton can directly measure.
- The published data directory contains the feature CSV, not raw swing videos. It cannot directly train a new video pose detector. Feature definitions, units and event numbering must be reconciled with the paper before joining our measurements to these columns. For example, our head displacement is normalized by video height; do not compare it directly with a differently normalized `HEAD-LOC`.

## Other sources

| Source                                                                                                                                                                    | Useful for                                                       | Access / limitation                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GolfDB / SwingNet](https://github.com/wmcnally/golfdb)                                                                                                                   | Eight swing events; automatic address/top/impact timing research | 1,400 swings in the paper. Reference code is CC BY-NC 4.0. It is not a coach-labelled error-to-drill dataset; source-video rights are separate.                                        |
| [GolfPose](https://github.com/MingHanLee/GolfPose)                                                                                                                        | Golf-specific body and club pose estimation                      | Dataset download requires author authorization. Custom EULA permits commercial model training but prohibits raw-data redistribution. No permission request or model download was made. |
| [CaddieSet paper](https://openaccess.thecvf.com/content/CVPR2025W/CVSPORTS/papers/Jung_CaddieSet_A_Golf_Swing_Dataset_with_Human_Joint_Features_and_CVPRW_2025_paper.pdf) | Feature/outcome associations and definitions                     | Eight golfers limit generalization; association alone does not show that changing a feature improves a shot.                                                                           |

## Recommended order

1. Validate overlay alignment and timing on the target iPhone, using face-on and down-the-line clips, slow motion and ordinary playback. Separate screen alignment, sampling error and incorrect model landmarks.
2. Compare Lite versus Full and denser sampling only in a short swing interval. Measure annotated landmark error, processing time, peak memory, heat and cancellation responsiveness on the same device/clips. Higher sampling increases work and cannot recover motion blur or hidden joints. Keep the current lightweight default until the experiment justifies a change.
3. Prototype a small set of measurable observations: phase timing, projected lead-arm bend and head displacement with a clear reference. Require handedness, camera view and sufficient confidence. A coach must validate interpretations and drills. Do not invent an ideal universal angle or score.
4. Evaluate CaddieSet offline with entire golfers held out, separated by view and club. Eight golfers and the unbalanced counts make a random row split misleading. Reconcile feature definitions and missingness before fitting a simple baseline. Test whether it improves on predicting each club/view's average outcome. Validate on new consented iPhone recordings paired with launch-monitor measurements and coach annotations before offering performance claims.
5. A language model can explain validated observations with evidence timestamps and curated references. It should not invent missing measurements or turn correlations into guaranteed corrections. No research dataset here supplies a ready-made reliable coaching API.

## Architecture choice still required

| Option                                                                    | Benefits                                                            | Costs and limits                                                                                                            | Reversibility                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Measurements + reviewed rules on iPhone first (recommended initial slice) | Works offline; no upload; directly inspectable findings             | Limited to reliable local landmarks; coach review needed                                                                    | Pure measurement/rule functions can later run on a server         |
| Explicitly send landmarks/measurements to a backend for feedback          | Small request; central rules and optional text generation           | Landmarks are personal data; cannot fix a misplaced joint without images; authorization, retention and rate limits needed   | Keep a versioned result contract; browser analysis remains usable |
| Explicitly upload a clip for server pose reanalysis                       | Can compare stronger golf/body/club models without taxing the phone | Upload delay, compute cost, job status/cancellation, access control and deletion policy; no guaranteed accuracy improvement | Keep an optional path beside browser processing                   |

The existing Cloudflare Worker serves static files only. A future Worker could validate feedback requests and orchestrate jobs; a video model needs a separately benchmarked inference runtime. Do not treat a Worker as an unrestricted Python/GPU host: see [Workers limits](https://developers.cloudflare.com/workers/platform/limits/). For a later video path, evaluate temporary object storage plus a bounded job worker, with explicit consent and short retention. No provider, paid service, storage, automatic upload or backend has been provisioned by this change.

A useful first backend experiment is a single opt-in landmark request returning at most two coach-reviewed observations with evidence and uncertainty, then comparing those with a coach's assessment. If tracking itself is wrong, test the optional video-reanalysis path separately. The user must choose the data flow before either is implemented, per AGENTS.md and decisions 0001/0002.
