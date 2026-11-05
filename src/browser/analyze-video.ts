import {
  MAX_BYTES,
  MAX_DURATION,
  MODEL,
  SAMPLE_RATE,
  sampleTimes,
} from "../domain/analysis.ts";
import type { Analysis, PoseFrame } from "../domain/analysis.ts";

export type Progress = { fraction: number; message: string };

function videoEvent(
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  action: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      video.removeEventListener(event, done);
      video.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
      error ? reject(error) : resolve();
    };
    const done = () => finish();
    const failed = () =>
      finish(
        new Error(
          "This video could not be decoded. Try exporting it as an MP4 from Photos.",
        ),
      );
    const aborted = () =>
      finish(new DOMException("Analysis cancelled", "AbortError"));
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            "Video decoding took too long. Keep this tab open and try a shorter clip.",
          ),
        ),
      20000,
    );
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) return aborted();
    try {
      action();
    } catch (error) {
      finish(
        error instanceof Error ? error : new Error("Video decoding failed."),
      );
    }
  });
}

function workerRequest<T>(
  worker: Worker,
  data: unknown,
  signal: AbortSignal,
  transfer: Transferable[] = [],
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      worker.removeEventListener("message", message);
      worker.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const message = (event: MessageEvent) => {
      cleanup();
      event.data.error
        ? reject(new Error(event.data.error))
        : resolve(event.data.result as T);
    };
    const failed = () =>
      fail(
        new Error(
          "Body tracking could not start in this browser. Reload the page and try again.",
        ),
      );
    const aborted = () =>
      fail(new DOMException("Analysis cancelled", "AbortError"));
    const timeout = setTimeout(
      () =>
        fail(
          new Error(
            "Body tracking timed out. Keep this tab visible and try again.",
          ),
        ),
      60000,
    );
    worker.addEventListener("message", message);
    worker.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) return aborted();
    try {
      worker.postMessage(data, transfer);
    } catch {
      failed();
    }
  });
}

export async function analyzeVideo(
  file: File,
  signal: AbortSignal,
  onProgress: (progress: Progress) => void,
): Promise<Analysis> {
  if (!file.size || file.size > MAX_BYTES)
    throw new Error("Choose a video smaller than 150 MB.");
  if (!window.Worker || !window.createImageBitmap || !window.OffscreenCanvas)
    throw new Error(
      "This browser does not support the video tools needed. Try a current version of Safari or Chrome.",
    );
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  let worker: Worker | undefined;
  const start = performance.now();
  try {
    onProgress({ fraction: 0, message: "Opening your video…" });
    await videoEvent(video, "loadeddata", signal, () => {
      video.src = url;
      video.load();
    });
    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      video.duration > MAX_DURATION
    )
      throw new Error(
        "Trim your video to 20 seconds or less in Photos, then choose it again.",
      );
    const { videoWidth: width, videoHeight: height, duration } = video;
    if (!width || !height)
      throw new Error("This video has no readable picture.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context)
      throw new Error("Video processing is unavailable in this browser.");
    worker = new Worker("/pose-worker.js");
    onProgress({
      fraction: 0,
      message: "Loading body tracking. The first run can take a moment…",
    });
    await workerRequest(worker, { type: "init" }, signal);
    const frames: PoseFrame[] = [];
    const times = sampleTimes(duration);
    for (let i = 0; i < times.length; i++) {
      signal.throwIfAborted();
      if (Math.abs(video.currentTime - times[i]) > 0.0001) {
        await videoEvent(video, "seeked", signal, () => {
          video.currentTime = times[i];
        });
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const bitmap = await createImageBitmap(canvas);
      try {
        const landmarks = await workerRequest<PoseFrame["landmarks"]>(
          worker,
          { type: "frame", bitmap, timestamp: Math.round(times[i] * 1000) + 1 },
          signal,
          [bitmap],
        );
        frames.push({ time: times[i], landmarks });
      } finally {
        bitmap.close();
      }
      onProgress({
        fraction: (i + 1) / times.length,
        message: `Tracking your swing · ${i + 1} of ${times.length} samples`,
      });
    }
    return {
      version: 1,
      model: MODEL,
      duration,
      width,
      height,
      sampleRate: SAMPLE_RATE,
      processingSeconds: (performance.now() - start) / 1000,
      frames,
    };
  } finally {
    worker?.terminate();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
