/* MediaPipe executes synchronously; a dedicated worker keeps controls responsive. */
importScripts("/mediapipe/vision_bundle.js");
let landmarker;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const files =
        await Vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      landmarker = await Vision.PoseLandmarker.createFromOptions(files, {
        canvas: new OffscreenCanvas(1, 1),
        baseOptions: {
          modelAssetPath: "/mediapipe/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
      self.postMessage({ result: true });
    } else if (data.type === "frame") {
      try {
        if (!landmarker) throw new Error("Body tracking is not initialized.");
        const result = landmarker.detectForVideo(data.bitmap, data.timestamp);
        self.postMessage({ result: result.landmarks[0] ?? null });
      } finally {
        data.bitmap.close();
      }
    }
  } catch (error) {
    console.error("Pose worker:", error);
    self.postMessage({
      error:
        "Body tracking could not process this video. Reload and try a shorter clip. No video has been uploaded.",
    });
  }
};
