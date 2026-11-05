"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONNECTIONS,
  jointAngle,
  MAX_BYTES,
  MAX_DURATION,
  METRICS,
  nearestFrame,
  reliable,
  setMarker,
} from "@/domain/analysis";
import type { Analysis, Markers, Metric } from "@/domain/analysis";
import type { Progress } from "@/browser/analyze-video";

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      style={{ transform: down ? "rotate(90deg)" : undefined }}
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

function FramingGuide() {
  return (
    <svg
      viewBox="0 0 480 330"
      className="framing-art"
      aria-label="Illustration showing a golfer fully in frame"
      role="img"
    >
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path
            d="M30 0H0V30"
            fill="none"
            stroke="#4d665c"
            strokeWidth="0.5"
            opacity="0.23"
          />
        </pattern>
      </defs>
      <rect width="480" height="330" fill="url(#grid)" />
      <ellipse
        cx="250"
        cy="285"
        rx="104"
        ry="12"
        fill="#354b3e"
        opacity="0.5"
      />
      <path
        d="M150 210C48 30 365-7 390 163"
        stroke="#9ab49b"
        strokeWidth="1"
        strokeDasharray="5 6"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M155 80V60h28m142 0h28v20M155 245v25h28m142 0h28v-25"
        stroke="#bddd9c"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="m242 123-25 65 23 36-26 54m26-54 40 51M242 123l25 28 42-30m-92 67 38-29 54-38"
        stroke="#7d9b88"
        strokeWidth="19"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="251" cy="99" r="19" fill="#7d9b88" />
      <path
        d="m309 121 46-82 14 3"
        stroke="#d5ddd1"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="m242 123-25 65 23 36-26 54m26-54 40 51M242 123l25 28 42-30m-92 67 38-29 54-38"
        stroke="#d4f591"
        strokeWidth="2"
        fill="none"
      />
      {[
        [242, 123],
        [217, 188],
        [240, 224],
        [214, 278],
        [280, 275],
        [267, 151],
        [309, 121],
        [255, 159],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#e2ffad" />
      ))}
      <text x="28" y="305" fill="#99ac9f" fontSize="10" letterSpacing="2">
        FRAMING GUIDE · ILLUSTRATION
      </text>
    </svg>
  );
}

function MovementChart({
  analysis,
  metric,
  time,
}: {
  analysis: Analysis;
  metric: Metric;
  time: number;
}) {
  let path = "";
  let connected = false;
  for (const frame of analysis.frames) {
    const angle = jointAngle(
      frame.landmarks,
      METRICS[metric].joints,
      analysis.width,
      analysis.height,
    );
    if (angle === null) {
      connected = false;
      continue;
    }
    const x = 38 + (frame.time / analysis.duration) * 510;
    const y = 132 - (angle / 180) * 108;
    path += `${connected ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)} `;
    connected = true;
  }
  return (
    <svg
      className="movement-chart"
      viewBox="0 0 570 164"
      role="img"
      aria-label={`${METRICS[metric].label} projected angle over video playback time. Gaps mean unreliable or missing tracking.`}
    >
      {[0, 90, 180].map((value) => (
        <g key={value}>
          <line
            x1="38"
            x2="548"
            y1={132 - (value / 180) * 108}
            y2={132 - (value / 180) * 108}
            stroke="#e6e9e1"
          />
          <text
            x="0"
            y={136 - (value / 180) * 108}
            fontSize="11"
            fill="#697468"
          >
            {value}°
          </text>
        </g>
      ))}
      <path
        d={path}
        fill="none"
        stroke="#4e742c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line
        x1={38 + (time / analysis.duration) * 510}
        x2={38 + (time / analysis.duration) * 510}
        y1="18"
        y2="136"
        stroke="#303f32"
        strokeDasharray="3 4"
      />
      <text x="38" y="157" fontSize="11" fill="#697468">
        0s
      </text>
      <text x="548" y="157" textAnchor="end" fontSize="11" fill="#697468">
        {analysis.duration.toFixed(1)}s
      </text>
      {!path && (
        <text x="285" y="80" textAnchor="middle" fontSize="13" fill="#697468">
          No reliable measurements for this joint
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
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
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
    if (!player || !analysis) return;
    let frameId = 0;
    const tick = () => {
      setTime(player.currentTime);
      if (!player.paused) frameId = requestAnimationFrame(tick);
    };
    player.addEventListener("play", tick);
    if (!player.paused) tick();
    return () => {
      player.removeEventListener("play", tick);
      cancelAnimationFrame(frameId);
    };
  }, [analysis, url]);

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
      video.current.currentTime = next;
    }
    setTime(next);
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
      measurementBasis: "2D projected angles; not validated 3D biomechanics",
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
  const angle = analysis
    ? jointAngle(
        frame?.landmarks ?? null,
        METRICS[metric].joints,
        analysis.width,
        analysis.height,
      )
    : null;
  const detected = analysis
    ? analysis.frames.filter((item) => item.landmarks !== null).length
    : 0;
  const canAnalyze =
    !!file && duration > 0 && duration <= MAX_DURATION && !busy;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Application identity">
        <a className="brand-mark" href="/" aria-label="GolfSwing home">
          g<span>↗</span>
        </a>
        <span className="rail-icon" aria-label="Swing studio">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <path d="m10 8 6 4-6 4z" />
          </svg>
        </span>
        <span className="rail-label">YOUR GAME. IN FOCUS.</span>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <a href="/" className="wordmark">
            GolfSwing<span className="wordmark-dot">.</span>
          </a>
          <span className="prototype-label">
            EARLY ACCESS <span>01</span>
          </span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">THE SWING STUDIO</p>
              <h1>
                See your swing.
                <br className="mobile-break" /> Find your rhythm.
              </h1>
              <p className="intro">
                A closer look at the movement behind every shot.
              </p>
            </div>
            <span className="session-badge">
              <span /> Private session
            </span>
          </div>
          <div className="studio-grid">
            <section className="video-card" aria-labelledby="video-title">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <span className="step-number">01</span>
                  <h2 id="video-title">Your swing</h2>
                </div>
                <span className="subtle-label">
                  {file ? "VIDEO LOADED" : "START HERE"}
                </span>
              </div>
              {url ? (
                <div className="video-stage">
                  <video
                    ref={video}
                    src={url}
                    controls
                    playsInline
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
                    onTimeUpdate={(event) =>
                      setTime(event.currentTarget.currentTime)
                    }
                    onSeeked={(event) =>
                      setTime(event.currentTarget.currentTime)
                    }
                    onError={() => {
                      setDuration(0);
                      setError(
                        "This video could not be opened. Try exporting it as an MP4 from Photos.",
                      );
                    }}
                    aria-label="Your swing video"
                  />
                  {analysis && overlay && frame?.landmarks && (
                    <svg
                      className="pose-overlay"
                      viewBox={`0 0 ${analysis.width} ${analysis.height}`}
                      aria-label="Detected body landmarks"
                      role="img"
                    >
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
                            stroke="#cafa7e"
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
                            fill="#f3ffdb"
                            stroke="#537338"
                            strokeWidth={Math.max(1, analysis.width / 600)}
                          />
                        ) : null,
                      )}
                    </svg>
                  )}
                </div>
              ) : (
                <div className="empty-stage">
                  <FramingGuide />
                  <div className="empty-caption">
                    <span className="tiny-dot" /> A little perspective changes
                    everything.
                  </div>
                </div>
              )}
              <div className="upload-panel">
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
                {!file ? (
                  <>
                    <h3>Every swing has a story.</h3>
                    <p>
                      Choose a short clip from your camera roll.
                      <br />
                      We’ll help you explore the movement.
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => input.current?.click()}
                    >
                      Choose a swing video <Arrow />
                    </button>
                    <span className="file-hint">
                      MP4 or MOV · Up to 20 seconds · 150 MB
                    </span>
                  </>
                ) : (
                  <>
                    <div className="file-details">
                      <div>
                        <strong>{file.name}</strong>
                        <span>
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                          {duration ? ` · ${duration.toFixed(1)} seconds` : ""}
                        </span>
                      </div>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => input.current?.click()}
                      >
                        Change video
                      </button>
                    </div>
                    <div className="analysis-actions">
                      <label className="view-field">
                        Camera view
                        <select
                          value={cameraView}
                          disabled={busy}
                          onChange={(event) =>
                            setCameraView(event.target.value)
                          }
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
                        {analysis ? "Analyze again" : "Analyze swing"}
                        <Arrow />
                      </button>
                    </div>
                  </>
                )}
                {progress && (
                  <div className="progress-area" role="status">
                    <div className="progress-heading">
                      <span>{progress.message}</span>
                      <button
                        className="text-button"
                        onClick={() => controller.current?.abort()}
                      >
                        Cancel
                      </button>
                    </div>
                    <progress
                      value={progress.fraction}
                      max={1}
                      aria-label="Analysis progress"
                    />
                    <small>
                      Keep this tab open while your swing is processed.
                    </small>
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
              </div>
            </section>
            <aside className="right-column">
              <section className="insight-card" aria-labelledby="insight-title">
                <div className="card-header">
                  <div className="flex items-center gap-3">
                    <span className="step-number">02</span>
                    <h2 id="insight-title">A clearer picture</h2>
                  </div>
                  <span aria-hidden="true">↗</span>
                </div>
                {analysis ? (
                  <div className="insight-body">
                    <span className="eyebrow">BODY TRACKING</span>
                    <div className="stat-value">
                      {Math.round((detected / analysis.frames.length) * 100)}
                      <span>%</span>
                    </div>
                    <p>
                      of sampled moments have a detected body. This is coverage,
                      not an accuracy score.
                    </p>
                    <div className="stat-pair">
                      <span>
                        Processing time
                        <strong>
                          {analysis.processingSeconds.toFixed(1)}s
                        </strong>
                      </span>
                      <span>
                        Samples<strong>{analysis.frames.length}</strong>
                      </span>
                    </div>
                    <button className="secondary-button" onClick={download}>
                      Save analysis data <Arrow down />
                    </button>
                  </div>
                ) : (
                  <div className="insight-body">
                    <div className="insight-glyph" aria-hidden="true">
                      ⌁
                    </div>
                    <h3>
                      Less guesswork.
                      <br />
                      More understanding.
                    </h3>
                    <p>
                      Follow your body position, slow things down, and spot how
                      your movement changes.
                    </p>
                    <div className="feature-row">
                      <span>01</span> Body tracking
                    </div>
                    <div className="feature-row">
                      <span>02</span> Joint-angle graphs
                    </div>
                    <div className="feature-row">
                      <span>03</span> Your key swing moments
                    </div>
                  </div>
                )}
              </section>
              <section className="tips-card">
                <p className="eyebrow">SET UP A BETTER SHOT</p>
                <h3>Good footage. Better insight.</h3>
                <ul>
                  <li>Keep your whole body in frame.</li>
                  <li>Use a steady camera at roughly hip height.</li>
                  <li>Film one golfer, with good light.</li>
                </ul>
                <details>
                  <summary>About this first version</summary>
                  <p>
                    Analysis runs on this device. Your video and measurements
                    are not uploaded. Results stay in this session unless you
                    save them.
                  </p>
                  <p>
                    We sample 15 moments per playback second. Slow-motion
                    playback time is not original capture time. Angles are 2D
                    estimates affected by camera position; no swing score or
                    coaching judgment is generated.
                  </p>
                </details>
              </section>
            </aside>
          </div>

          {analysis && (
            <section className="results-card" aria-labelledby="results-title">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <span className="step-number">03</span>
                  <h2 id="results-title">Explore the movement</h2>
                </div>
                <label className="overlay-toggle">
                  <input
                    type="checkbox"
                    checked={overlay}
                    onChange={(event) => setOverlay(event.target.checked)}
                  />{" "}
                  Skeleton
                </label>
              </div>
              <div className="results-body">
                <div className="timeline-heading">
                  <span>VIDEO TIMELINE</span>
                  <span className="time-readout">
                    {time.toFixed(2)} <span>/ {duration.toFixed(2)}s</span>
                  </span>
                </div>
                <input
                  className="timeline"
                  type="range"
                  min={0}
                  max={duration}
                  step={1 / analysis.sampleRate}
                  value={time}
                  onChange={(event) => seek(Number(event.target.value))}
                  aria-label="Video position"
                  aria-valuetext={`${time.toFixed(2)} seconds`}
                />
                <div className="timeline-controls">
                  <button
                    className="secondary-button"
                    onClick={() => seek(time - 1 / analysis.sampleRate)}
                  >
                    ← Previous sample
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => seek(time + 1 / analysis.sampleRate)}
                  >
                    Next sample →
                  </button>
                </div>
                <div className="measurement-heading">
                  <label>
                    Projected joint angle
                    <select
                      value={metric}
                      onChange={(event) =>
                        setMetric(event.target.value as Metric)
                      }
                    >
                      {Object.entries(METRICS).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="angle-value">
                    {angle === null ? "—" : `${Math.round(angle)}°`}
                    <small>
                      {angle === null
                        ? "No reliable measurement here"
                        : "2D angle · camera dependent"}
                    </small>
                  </div>
                </div>
                <MovementChart
                  analysis={analysis}
                  metric={metric}
                  time={time}
                />
                <div className="phase-heading">
                  <div>
                    <h3>Mark your swing moments</h3>
                    <p>
                      Scrub to a moment, then set its marker. These are your
                      selections.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setMarkers({})}
                  >
                    Clear markers
                  </button>
                </div>
                <div className="phase-buttons">
                  {(["address", "top", "impact"] as const).map((name) => (
                    <button
                      key={name}
                      className="phase-button"
                      onClick={() => mark(name)}
                    >
                      <span>
                        {name === "top"
                          ? "Top of backswing"
                          : name[0].toUpperCase() + name.slice(1)}
                      </span>
                      <strong>
                        {markers[name] === undefined
                          ? "Set at current time +"
                          : `${markers[name]?.toFixed(2)}s · update`}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          <footer>
            <span className="privacy-note">
              <svg
                width="14"
                height="16"
                viewBox="0 0 20 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <path d="m10 2 7 3v6c0 4-7 9-7 9s-7-5-7-9V5z" />
                <path d="m6 10 3 3 5-6" />
              </svg>{" "}
              Your swing stays on your device.
            </span>
            <span>Built for a closer look.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
