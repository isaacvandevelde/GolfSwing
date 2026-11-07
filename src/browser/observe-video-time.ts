/** Follow presented frames, rather than the playback clock ahead of decoding. */
export function observeVideoTime(
  video: HTMLVideoElement,
  onTime: (time: number) => void,
): () => void {
  let callback = 0;
  const presentedFrames = typeof video.requestVideoFrameCallback === "function";
  const update = () => onTime(video.currentTime);
  const frame: VideoFrameRequestCallback = (_, metadata) => {
    // Analysis samples use requested seek times; preserve those while paused.
    onTime(video.paused ? video.currentTime : metadata.mediaTime);
    callback = video.requestVideoFrameCallback(frame);
  };
  const tick = () => {
    update();
    if (!video.paused && !video.ended) callback = requestAnimationFrame(tick);
  };
  const play = () => {
    cancelAnimationFrame(callback);
    tick();
  };
  const pause = () => {
    if (!presentedFrames) cancelAnimationFrame(callback);
  };
  const settled = () => {
    // Paused seeks may not produce a frame callback in older browsers.
    if (!presentedFrames || video.paused) update();
  };
  video.addEventListener("seeked", settled);
  video.addEventListener("loadeddata", update);
  video.addEventListener("pause", pause);
  if (presentedFrames) callback = video.requestVideoFrameCallback(frame);
  else {
    video.addEventListener("play", play);
    video.addEventListener("timeupdate", update);
    if (!video.paused) play();
  }
  return () => {
    if (presentedFrames) video.cancelVideoFrameCallback(callback);
    else cancelAnimationFrame(callback);
    video.removeEventListener("seeked", settled);
    video.removeEventListener("loadeddata", update);
    video.removeEventListener("pause", pause);
    video.removeEventListener("play", play);
    video.removeEventListener("timeupdate", update);
  };
}
