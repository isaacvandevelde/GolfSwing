import test from "node:test";
import assert from "node:assert/strict";
import { observeVideoTime } from "../src/browser/observe-video-time.ts";

class Video extends EventTarget {
  currentTime = 0;
  paused = true;
  ended = false;
  nextId = 0;
  callbacks = new Map<number, VideoFrameRequestCallback>();
  requestVideoFrameCallback(callback: VideoFrameRequestCallback) {
    const id = ++this.nextId;
    this.callbacks.set(id, callback);
    return id;
  }
  cancelVideoFrameCallback(id: number) {
    this.callbacks.delete(id);
  }
  present(mediaTime: number) {
    const pending = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of pending)
      callback(0, { mediaTime } as VideoFrameCallbackMetadata);
  }
}

test("overlay follows the presented frame rather than a clock ahead of it", () => {
  const video = new Video();
  const times: number[] = [];
  const stop = observeVideoTime(video as unknown as HTMLVideoElement, (time) =>
    times.push(time),
  );
  video.paused = false;
  video.currentTime = 0.3;
  video.present(0.2);
  video.dispatchEvent(new Event("timeupdate"));
  video.dispatchEvent(new Event("seeked"));
  assert.deepEqual(times, [0.2]);
  assert.equal(video.callbacks.size, 1);
  video.paused = true;
  video.currentTime = 1;
  video.dispatchEvent(new Event("seeked"));
  assert.equal(times.at(-1), 1);
  video.present(0.99);
  assert.equal(times.at(-1), 1);
  stop();
  assert.equal(video.callbacks.size, 0);
  video.dispatchEvent(new Event("seeked"));
  video.present(2);
  assert.equal(times.at(-1), 1);
});

test("older browsers update during playback and stop scheduling after pause or cleanup", () => {
  let id = 0;
  const pending = new Map<number, FrameRequestCallback>();
  const oldRequest = globalThis.requestAnimationFrame;
  const oldCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    pending.set(++id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    pending.delete(id);
  };
  try {
    const video = new EventTarget() as HTMLVideoElement;
    Object.assign(video, { currentTime: 0, paused: true, ended: false });
    const times: number[] = [];
    const stop = observeVideoTime(video, (time) => times.push(time));
    Object.assign(video, { currentTime: 0.2, paused: false });
    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("play"));
    assert.equal(pending.size, 1);
    assert.equal(times.at(-1), 0.2);
    Object.assign(video, { paused: true });
    video.dispatchEvent(new Event("pause"));
    assert.equal(pending.size, 0);
    video.currentTime = 1;
    video.dispatchEvent(new Event("seeked"));
    assert.equal(times.at(-1), 1);
    Object.assign(video, { paused: false });
    video.dispatchEvent(new Event("play"));
    stop();
    assert.equal(pending.size, 0);
    video.dispatchEvent(new Event("play"));
    assert.equal(pending.size, 0);
  } finally {
    globalThis.requestAnimationFrame = oldRequest;
    globalThis.cancelAnimationFrame = oldCancel;
  }
});
