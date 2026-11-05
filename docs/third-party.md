# Third-party notices

## MediaPipe

Runtime: @mediapipe/tasks-vision 1.2.2, published by the MediaPipe authors under Apache-2.0. The unchanged runtime and WASM assets are copied from the installed package into generated public/mediapipe/ during setup. The Apache license is retained at public/mediapipe-LICENSE.txt.

Model: Pose Landmarker Lite, float16, version 1, linked from the official [MediaPipe pose documentation](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker).

Source: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

SHA-256: 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a

The binary is fetched during setup and excluded from Git. Changes to model versions require updating and reviewing the source, checksum and behavior together. The application uses model output as estimates, not validated biomechanical measurements.

## Repository skills

Ponytail and Ponytail Review are copied from version 5.3.3 and retain their MIT licenses beside their SKILL.md files. See [tooling](tooling.md) for source attribution.
