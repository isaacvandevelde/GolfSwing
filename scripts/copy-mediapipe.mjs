import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const directory = new URL("../public/mediapipe/", import.meta.url);
const modelPath = new URL("pose_landmarker_lite.task", directory);
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const expectedHash =
  "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a";
const hash = (data) => createHash("sha256").update(data).digest("hex");

await mkdir(directory, { recursive: true });
await cp(
  new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url),
  new URL("wasm/", directory),
  { recursive: true },
);
await cp(
  new URL(
    "../node_modules/@mediapipe/tasks-vision/vision_bundle.js",
    import.meta.url,
  ),
  new URL("vision_bundle.js", directory),
);
let model;
try {
  model = await readFile(modelPath);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!model || hash(model) !== expectedHash) {
  console.log(
    "Downloading the pinned MediaPipe pose model for local browser analysis…",
  );
  const response = await fetch(modelUrl, {
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok)
    throw new Error(
      `Model download failed (${response.status}). Run npm run prepare:assets to retry.`,
    );
  model = Buffer.from(await response.arrayBuffer());
  if (hash(model) !== expectedHash)
    throw new Error("Model checksum mismatch. No unverified model was saved.");
  await writeFile(modelPath, model);
}
console.log(
  "MediaPipe runtime and verified pose model are ready in public/mediapipe.",
);
