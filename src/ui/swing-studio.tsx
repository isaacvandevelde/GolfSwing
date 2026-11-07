"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONNECTIONS,
  metricValue,
  MAX_BYTES,
  MAX_DURATION,
  METRICS,
  nearestFrame,
  reliable,
  setMarker,
} from "@/domain/analysis";
import type { Analysis, Landmark, Markers, Metric } from "@/domain/analysis";
import type { Progress } from "@/browser/analyze-video";
import { observeVideoTime } from "@/browser/observe-video-time";

function MovementChart({
  analysis,
  metric,
  time,
  reference,
}: {
  analysis: Analysis;
  metric: Metric;
  time: number;
  reference: Landmark[] | null;
}) {
  const values = useMemo(
    () =>
      analysis.frames.map((frame) => ({
        time: frame.time,
        value: metricValue(
          metric,
          frame.landmarks,
          analysis.width,
          analysis.height,
          reference,
        ),
      })),
    [analysis, metric, reference],
  );
  const maximum =
    metric === "headMovement"
      ? Math.max(
          5,
          Math.ceil(Math.max(...values.map((item) => item.value ?? 0)) / 5) * 5,
        )
      : 180;
  const unit = metric === "headMovement" ? "%" : "°";
  const path = useMemo(() => {
    let result = "";
    let connected = false;
    for (const item of values) {
      if (item.value === null) {
        connected = false;
        continue;
      }
      const x = 38 + (item.time / analysis.duration) * 510;
      const y = 132 - (item.value / maximum) * 108;
      result += `${connected ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
      connected = true;
    }
    return result;
  }, [values, maximum, analysis.duration]);
  return (
    <svg
      className="movement-chart"
      viewBox="0 0 570 164"
      role="img"
      aria-label={`${METRICS[metric].label} over video playback time, in ${metric === "headMovement" ? "percent of video height from address" : "degrees"}. Gaps mean unreliable or missing tracking.`}
    >
      {[0, maximum / 2, maximum].map((value) => (
        <g key={value}>
          <line
            x1="38"
            x2="548"
            y1={132 - (value / maximum) * 108}
            y2={132 - (value / maximum) * 108}
            stroke="#343a40"
          />
          <text
            x="0"
            y={136 - (value / maximum) * 108}
            fontSize="11"
            fill="#a3abb4"
          >
            {value}
            {unit}
          </text>
        </g>
      ))}
      <path
        d={path}
        fill="none"
        stroke="#64d9ed"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line
        x1={38 + (time / analysis.duration) * 510}
        x2={38 + (time / analysis.duration) * 510}
        y1="18"
        y2="136"
        stroke="#e4e9ee"
        strokeDasharray="3 4"
      />
      <text x="38" y="157" fontSize="11" fill="#a3abb4">
        0s
      </text>
      <text x="548" y="157" textAnchor="end" fontSize="11" fill="#a3abb4">
        {analysis.duration.toFixed(1)}s
      </text>
      {!path && (
        <text x="285" y="80" textAnchor="middle" fontSize="13" fill="#a3abb4">
          No reliable measurements
        </text>
      )}
    </svg>
  );
}

export default function SwingStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [metric, setMetric] = useState<Metric>("leftElbow");
  const [overlay, setOverlay] = useState(true);
  const [markers, setMarkers] = useState<Markers>({});
  const [cameraView, setCameraView] = useState("down-the-line");
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const viewer = useRef<HTMLElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const busy = progress !== null;

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const player = video.current;
    if (player) return observeVideoTime(player, setTime);
  }, [url]);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expandButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key !== "Tab") return;
      const controls = viewer.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled)",
      );
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      expandButton.current?.focus();
    };
  }, [expanded]);

  function chooseFile(selected: File | undefined) {
    if (!selected || busy) return;
    setError("");
    setNotice("");
    if (!(
      selected.type.startsWith("video/") ||
      /\.(mp4|mov|m4v|webm)$/i.test(selected.name)
    )) {
      setError("Choose a video file, such as an MP4 or MOV.");
      return;
    }
    if (!selected.size || selected.size > MAX_BYTES) {
      setError(
        "Choose a video smaller than 150 MB. You can trim it in Photos first.",
      );
      return;
    }
    setFile(selected);
    setUrl(URL.createObjectURL(selected));
    setDuration(0);
    setTime(0);
    setPlaying(false);
    setSeeking(false);
    setAnalysis(null);
    setMarkers({});
  }

  async function analyze() {
    if (!file || busy || !duration) return;
    video.current?.pause();
    const run = new AbortController();
    controller.current = run;
    setProgress({ fraction: 0, message: "Preparing your swing…" });
    setError("");
    setNotice("");
    setAnalysis(null);
    try {
      const { analyzeVideo } = await import("@/browser/analyze-video");
      const result = await analyzeVideo(file, run.signal, setProgress);
      setAnalysis(result);
      seek(0);
      if (!result.frames.some((frame) => frame.landmarks))
        setNotice(
          "No body was detected. Try a brighter clip with your whole body visible and only one golfer in frame.",
        );
    } catch (problem) {
      if (run.signal.aborted)
        setNotice("Analysis cancelled. Your video is ready to try again.");
      else
        setError(
          problem instanceof Error
            ? problem.message
            : "Something went wrong. Please try again.",
        );
    } finally {
      controller.current = null;
      setProgress(null);
    }
  }

  function seek(value: number) {
    const next = Math.max(0, Math.min(duration, value));
    if (video.current) {
      video.current.pause();
      if (video.current.currentTime !== next) setSeeking(true);
      video.current.currentTime = next;
    }
    setTime(next);
  }
  async function togglePlayback() {
    const player = video.current;
    if (!player) return;
    if (!player.paused) player.pause();
    else {
      try {
        await player.play();
        setError("");
      } catch {
        setError("Playback could not start. Tap Play to try again.");
      }
    }
  }
  function mark(name: keyof Markers) {
    try {
      setMarkers(setMarker(markers, name, time));
      setError("");
    } catch (problem) {
      setError((problem as Error).message);
    }
  }
  function download() {
    if (!analysis) return;
    const data = {
      ...analysis,
      cameraView,
      markers,
      timeBasis: "video playback seconds; not capture-frame timing",
      measurementBasis:
        "2D projected measurements; not validated 3D biomechanics",
      headMovementBasis: {
        landmark: "nose",
        unit: "percent of video height",
        referenceMarker: "address",
        referenceSampleTime: referenceFrame?.time ?? null,
      },
    };
    const downloadUrl = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "golfswing-analysis.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  const frame = analysis
    ? nearestFrame(analysis.frames, time, 0.75 / analysis.sampleRate)
    : null;
  const referenceFrame =
    analysis && markers.address !== undefined
      ? nearestFrame(
          analysis.frames,
          markers.address,
          0.75 / analysis.sampleRate,
        )
      : null;
  const reference = referenceFrame?.landmarks ?? null;
  const measurement = analysis
    ? metricValue(
        metric,
        frame?.landmarks ?? null,
        analysis.width,
        analysis.height,
        reference,
      )
    : null;
  const detected = analysis
    ? analysis.frames.filter((item) => item.landmarks !== null).length
    : 0;
  const canAnalyze =
    !!file && duration > 0 && duration <= MAX_DURATION && !busy;

  return (
    <div className="workbench">
      <header className="workbench-header" inert={expanded}>
        <h1>
          GolfSwing <span>/ analysis workbench</span>
        </h1>
        <span className="run-status">
          {busy ? "PROCESSING" : analysis ? "ANALYZED" : "IDLE"}
        </span>
      </header>
      <main className="workspace">
        <div className="viewer-column">
          <section
            ref={viewer}
            className={`panel video-panel${expanded ? " is-expanded" : ""}`}
            aria-labelledby="video-title"
            role={expanded ? "dialog" : undefined}
            aria-modal={expanded || undefined}
          >
            <div className="panel-heading">
              <h2 id="video-title">01 / Video + pose</h2>
              <label className="inline-control">
                <input
                  type="checkbox"
                  checked={overlay}
                  onChange={(event) => setOverlay(event.target.checked)}
                />{" "}
                Skeleton
              </label>
              <button
                ref={expandButton}
                disabled={!url || busy}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? "Close expanded video"
                    : "Expand video with overlay"
                }
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Close ✕" : "Expand ⛶"}
              </button>
            </div>
            {url ? (
              <div className="video-stage">
                <video
                  ref={video}
                  src={url}
                  playsInline
                  disablePictureInPicture
                  preload="auto"
                  onLoadedMetadata={(event) => {
                    const seconds = event.currentTarget.duration;
                    if (
                      !Number.isFinite(seconds) ||
                      seconds <= 0 ||
                      seconds > MAX_DURATION
                    ) {
                      setDuration(0);
                      setError(
                        "Trim your video to 20 seconds or less in Photos, then choose it again.",
                      );
                    } else setDuration(seconds);
                  }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onSeeking={() => setSeeking(true)}
                  onSeeked={() => setSeeking(false)}
                  onError={() => {
                    setDuration(0);
                    setPlaying(false);
                    setSeeking(false);
                    setError(
                      "This video could not be opened. Try exporting it as an MP4 from Photos.",
                    );
                  }}
                  aria-label="Your swing video"
                />
                {analysis && overlay && !seeking && frame?.landmarks && (
                  <svg
                    className="pose-overlay"
                    viewBox={`0 0 ${analysis.width} ${analysis.height}`}
                    preserveAspectRatio="xMidYMid meet"
                    aria-label="Detected body landmarks"
                    role="img"
                  >
                    <defs>
                      <clipPath id="pose-frame">
                        <rect width={analysis.width} height={analysis.height} />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#pose-frame)">
                      {CONNECTIONS.map(([a, b]) => {
                        const p = frame.landmarks?.[a];
                        const q = frame.landmarks?.[b];
                        return reliable(p) && reliable(q) ? (
                          <line
                            key={`${a}-${b}`}
                            x1={p.x * analysis.width}
                            y1={p.y * analysis.height}
                            x2={q.x * analysis.width}
                            y2={q.y * analysis.height}
                            stroke={a % 2 ? "#64d9ed" : "#ed91c8"}
                            strokeWidth={Math.max(2, analysis.width / 220)}
                          />
                        ) : null;
                      })}
                      {frame.landmarks.map((p, i) =>
                        reliable(p) ? (
                          <circle
                            key={i}
                            cx={p.x * analysis.width}
                            cy={p.y * analysis.height}
                            r={Math.max(3, analysis.width / 140)}
                            fill={i % 2 ? "#64d9ed" : "#ed91c8"}
                            stroke="#101214"
                            strokeWidth={Math.max(1, analysis.width / 600)}
                          />
                        ) : null,
                      )}
                    </g>
                  </svg>
                )}
              </div>
            ) : (
              <div className="empty-stage">
                <strong>No video loaded</strong>
                <span>Open MP4 / MOV → run extraction → inspect samples</span>
              </div>
            )}

            <div className="video-readout">
              <span>t = {time.toFixed(3)} s</span>
              <span className="left-color">● left</span>
              <span className="right-color">● right</span>
              <span>
                {frame?.landmarks
                  ? "pose detected"
                  : analysis
                    ? "no pose at this time"
                    : "no pose data"}
              </span>
            </div>
            <div className="transport">
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={analysis ? 1 / analysis.sampleRate : 0.01}
                value={time}
                disabled={!duration}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Video position"
                aria-valuetext={time.toFixed(2) + " seconds"}
              />
              <div className="transport-buttons">
                <button disabled={!duration || busy} onClick={togglePlayback}>
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  disabled={!analysis}
                  onClick={() => seek(time - 1 / (analysis?.sampleRate || 15))}
                >
                  ← Sample
                </button>
                <button
                  disabled={!analysis}
                  onClick={() => seek(time + 1 / (analysis?.sampleRate || 15))}
                >
                  Sample →
                </button>
                <span>
                  {time.toFixed(2)} / {duration.toFixed(2)} s
                </span>
              </div>
              {expanded && error && (
                <p role="alert" className="message error">
                  {error}
                </p>
              )}
            </div>
          </section>
          <section
            className="panel"
            aria-labelledby="results-title"
            inert={expanded}
          >
            <div className="panel-heading">
              <h2 id="results-title">02 / Measurements</h2>
              <span>2D projection</span>
            </div>
            <div className="panel-body">
              <div className="measurement-heading">
                <label>
                  Signal
                  <select
                    value={metric}
                    onChange={(event) =>
                      setMetric(event.target.value as Metric)
                    }
                  >
                    {Object.entries(METRICS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <output className="measurement-value">
                  {measurement === null
                    ? "—"
                    : metric === "headMovement"
                      ? measurement.toFixed(1) + "%"
                      : measurement.toFixed(1) + "°"}
                </output>
              </div>
              {analysis ? (
                <MovementChart
                  analysis={analysis}
                  metric={metric}
                  time={time}
                  reference={reference}
                />
              ) : (
                <div className="chart-empty">
                  Run pose extraction to populate the signal.
                </div>
              )}
              <p className="technical-note">
                {metric === "headMovement"
                  ? "Nose displacement from Address, as % of video height. Set a reliable Address sample first. Camera movement and head rotation affect this proxy."
                  : "Projected joint angle. Straight = 180°. Gaps indicate missing or uncertain tracking."}
              </p>
            </div>
          </section>
          <section
            className="panel"
            aria-labelledby="phase-title"
            inert={expanded}
          >
            <div className="panel-heading">
              <h2 id="phase-title">03 / Manual events</h2>
              <button
                className="text-button"
                disabled={!analysis}
                onClick={() => setMarkers({})}
              >
                Clear
              </button>
            </div>
            <div className="panel-body phase-buttons">
              {(["address", "top", "impact"] as const).map((name) => (
                <button
                  key={name}
                  disabled={!analysis}
                  onClick={() => mark(name)}
                >
                  <span>{name === "top" ? "Top of backswing" : name}</span>
                  <strong>
                    {markers[name] === undefined
                      ? "Set at cursor"
                      : markers[name]?.toFixed(3) + " s · update"}
                  </strong>
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="inspector" inert={expanded}>
          <section className="panel" aria-labelledby="input-title">
            <div className="panel-heading">
              <h2 id="input-title">Input</h2>
              <span>MP4 / MOV</span>
            </div>
            <div className="panel-body controls">
              <input
                ref={input}
                type="file"
                accept="video/*,.mov,.mp4,.m4v"
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose swing video"
                disabled={busy}
                onChange={(event) => {
                  chooseFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button disabled={busy} onClick={() => input.current?.click()}>
                {file ? "Replace video…" : "Open video…"}
              </button>
              <div className="source-name">
                {file?.name || "No source selected"}
              </div>
              <dl className="metadata">
                <dt>Size</dt>
                <dd>
                  {file ? (file.size / 1024 / 1024).toFixed(1) + " MiB" : "—"}
                </dd>
                <dt>Duration</dt>
                <dd>{duration ? duration.toFixed(3) + " s" : "—"}</dd>
                <dt>Dimensions</dt>
                <dd>
                  {analysis ? analysis.width + " × " + analysis.height : "—"}
                </dd>
              </dl>
              <label>
                Camera view
                <select
                  value={cameraView}
                  disabled={busy}
                  onChange={(event) => setCameraView(event.target.value)}
                >
                  <option value="down-the-line">Down the line</option>
                  <option value="face-on">Face on</option>
                </select>
              </label>
              <button
                className="primary-button"
                disabled={!canAnalyze}
                onClick={analyze}
              >
                {analysis ? "Re-run pose extraction" : "Run pose extraction"}
              </button>
              {progress && (
                <div className="progress-area" role="status">
                  <span>{progress.message}</span>
                  <progress
                    value={progress.fraction}
                    max={1}
                    aria-label="Analysis progress"
                  />
                  <button onClick={() => controller.current?.abort()}>
                    Cancel
                  </button>
                </div>
              )}
              {error && (
                <div className="message error" role="alert">
                  {error}
                </div>
              )}
              {notice && (
                <div className="message" role="status">
                  {notice}
                </div>
              )}
              <p className="technical-note">
                ≤ 20 s · ≤ 150 MiB · browser-supported codec
              </p>
            </div>
          </section>
          <section className="panel" aria-labelledby="pipeline-title">
            <div className="panel-heading">
              <h2 id="pipeline-title">Pipeline / run data</h2>
            </div>
            <div className="panel-body">
              <dl className="metadata">
                <dt>Model</dt>
                <dd>MediaPipe Pose Lite</dd>
                <dt>Runtime</dt>
                <dd>Browser · CPU worker</dd>
                <dt>Sampling</dt>
                <dd>15 / playback second</dd>
                <dt>Inference size</dt>
                <dd>≤ 640 px longest edge</dd>
                <dt>Pose samples</dt>
                <dd>
                  {analysis ? detected + " / " + analysis.frames.length : "—"}
                </dd>
                <dt>Processing</dt>
                <dd>
                  {analysis
                    ? analysis.processingSeconds.toFixed(2) + " s"
                    : "—"}
                </dd>
              </dl>
              <button
                className="export-button"
                disabled={!analysis}
                onClick={download}
              >
                Export landmarks + events.json
              </button>
              <p className="technical-note">
                Samples found ≠ tracking accuracy. Video and landmarks stay in
                this browser session unless exported.
              </p>
            </div>
          </section>
          <section className="panel" aria-labelledby="sample-title">
            <div className="panel-heading">
              <h2 id="sample-title">Sample inspector</h2>
              <span>{frame ? frame.time.toFixed(3) + " s" : "—"}</span>
            </div>
            <div className="panel-body">
              {analysis ? (
                <table className="metrics-table">
                  <caption>Measurements at cursor</caption>
                  <tbody>
                    {Object.entries(METRICS).map(([key, item]) => {
                      const value = metricValue(
                        key as Metric,
                        frame?.landmarks ?? null,
                        analysis.width,
                        analysis.height,
                        reference,
                      );
                      return (
                        <tr key={key}>
                          <th scope="row">{item.label}</th>
                          <td>
                            {value === null
                              ? "—"
                              : value.toFixed(1) +
                                (key === "headMovement" ? "%" : "°")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="technical-note">
                  No samples. Load a clip and run extraction.
                </p>
              )}
              <details>
                <summary>Raw landmarks / current sample</summary>
                {frame?.landmarks ? (
                  <div className="table-scroll">
                    <table>
                      <caption>
                        Normalized model coordinates; z is not metres. v =
                        visibility. Low-confidence values are excluded from
                        measurements.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">id</th>
                          <th scope="col">x</th>
                          <th scope="col">y</th>
                          <th scope="col">z</th>
                          <th scope="col">v</th>
                        </tr>
                      </thead>
                      <tbody>
                        {frame.landmarks.map((point, index) => (
                          <tr
                            key={index}
                            className={reliable(point) ? "" : "uncertain"}
                          >
                            <th scope="row">{index}</th>
                            <td>{point.x.toFixed(3)}</td>
                            <td>{point.y.toFixed(3)}</td>
                            <td>{point.z.toFixed(3)}</td>
                            <td>{point.visibility.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="technical-note">
                    No pose at the selected time.
                  </p>
                )}
              </details>
            </div>
          </section>
          <details className="panel capture-notes">
            <summary>Capture notes + limits</summary>
            <p>
              {cameraView === "down-the-line"
                ? "Camera behind the golfer, looking toward the target."
                : "Camera facing the golfer, across the target line."}{" "}
              Fixed camera, whole body visible, one golfer, good lighting.
            </p>
            <p>
              Playback seconds are not capture timing in slow-motion footage.
              Sampling is not frame-exact. No validated 3D rotation, club
              tracking or automated impact detection.
            </p>
          </details>
        </aside>
      </main>
      <footer inert={expanded}>
        Experimental pose analysis · session-only data · no cloud inference
      </footer>
    </div>
  );
}
