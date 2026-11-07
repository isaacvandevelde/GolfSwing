import { MAX_BYTES, MAX_DURATION } from "../domain/analysis";
import { trackingTimes } from "../domain/object-tracking";
import type { ObjectSample } from "../domain/object-tracking";
import { videoEvent, workerRequest } from "./analyze-video";
import type { Progress } from "./analyze-video";

export async function trackObject(
  file: File,
  seed: ObjectSample,
  seconds: number,
  signal: AbortSignal,
  onProgress: (p: Progress) => void,
): Promise<ObjectSample[]> {
  if (!file.size || file.size > MAX_BYTES)
    throw new Error("Choose a video smaller than 150 MB.");
  if (
    !seed.point ||
    ![seed.point.x, seed.point.y].every(
      (v) => Number.isFinite(v) && v >= 0 && v <= 1,
    )
  )
    throw new Error("Mark the target inside the video.");
  if (!Number.isInteger(seed.radius) || seed.radius < 4 || seed.radius > 32)
    throw new Error("Choose a patch between 9 and 65 pixels wide.");
  if (!window.Worker)
    throw new Error("This browser does not support local tracking workers.");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  let worker: Worker | undefined;
  try {
    await videoEvent(video, "loadeddata", signal, () => {
      video.src = url;
      video.load();
    });
    if (
      !video.videoWidth ||
      !video.videoHeight ||
      !Number.isFinite(video.duration) ||
      video.duration > MAX_DURATION
    )
      throw new Error("Use a readable video up to 20 seconds long.");
    const times = trackingTimes(seed.time, video.duration, seconds);
    if (times.length < 2)
      throw new Error("Choose a start earlier in the video.");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
      throw new Error("Video processing is unavailable in this browser.");
    worker = new Worker(
      new URL("./object-tracking-worker.ts", import.meta.url),
      { type: "module" },
    );
    const { videoWidth: width, videoHeight: height } = video;
    let point = { x: seed.point.x * width, y: seed.point.y * height };
    let velocity = { x: 0, y: 0 };
    const samples: ObjectSample[] = [{ ...seed }];
    for (let i = 0; i < times.length; i++) {
      signal.throwIfAborted();
      if (Math.abs(video.currentTime - times[i]) > 0.0001)
        await videoEvent(video, "seeked", signal, () => {
          video.currentTime = times[i];
        });
      // Crop at source resolution: the small ball must not disappear in a full-frame resize.
      const margin = seed.radius + (i ? 48 : 2);
      const center = {
        x: Math.max(0, Math.min(width - 1, point.x + velocity.x)),
        y: Math.max(0, Math.min(height - 1, point.y + velocity.y)),
      };
      const left = Math.max(0, Math.round(center.x) - margin);
      const top = Math.max(0, Math.round(center.y) - margin);
      canvas.width = Math.min(width - left, margin * 2 + 1);
      canvas.height = Math.min(height - top, margin * 2 + 1);
      ctx.drawImage(
        video,
        left,
        top,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const gray = new Uint8Array(canvas.width * canvas.height);
      for (let p = 0; p < gray.length; p++)
        gray[p] = Math.round(
          rgba[p * 4] * 0.299 +
            rgba[p * 4 + 1] * 0.587 +
            rgba[p * 4 + 2] * 0.114,
        );
      const result = await workerRequest<{
        x: number;
        y: number;
        similarity: number;
      } | null>(
        worker,
        {
          type: i ? "frame" : "init",
          image: { data: gray, width: canvas.width, height: canvas.height },
          x: Math.round(point.x) - left,
          y: Math.round(point.y) - top,
          radius: seed.radius,
        },
        signal,
        [gray.buffer],
      );
      onProgress({
        fraction: (i + 1) / times.length,
        message: `Following target · ${i + 1} / ${times.length}`,
      });
      if (!i) continue;
      if (!result) {
        samples.push({
          time: times[i],
          point: null,
          source: "lost",
          similarity: null,
          radius: seed.radius,
        });
        break;
      }
      const next = { x: result.x + left, y: result.y + top };
      velocity = {
        x: Math.max(-48, Math.min(48, next.x - point.x)),
        y: Math.max(-48, Math.min(48, next.y - point.y)),
      };
      point = next;
      samples.push({
        time: times[i],
        point: { x: point.x / width, y: point.y / height },
        source: "tracked",
        similarity: result.similarity,
        radius: seed.radius,
      });
    }
    return samples;
  } finally {
    worker?.terminate();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
