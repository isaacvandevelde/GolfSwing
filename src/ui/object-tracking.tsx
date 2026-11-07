import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Progress } from "@/browser/analyze-video";
import {
  OBJECT_LABELS,
  objectAt,
  replaceTrackFrom,
  trailPath,
  videoPoint,
} from "@/domain/object-tracking";
import type { ObjectKind, ObjectTracks, Point } from "@/domain/object-tracking";

export function useObjectTracking(
  file: File | null,
  video: RefObject<HTMLVideoElement | null>,
  time: number,
  seek: (time: number) => void,
) {
  const [tracks, setTracks] = useState<ObjectTracks>({
    clubhead: [],
    ball: [],
  });
  const [target, setTarget] = useState<ObjectKind>("clubhead");
  const [draft, setDraft] = useState<Point | null>(null);
  const [radius, setRadius] = useState(12);
  const [seconds, setSeconds] = useState(1);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const current = objectAt(tracks[target], time);

  function reset() {
    controller.current?.abort();
    setTracks({ clubhead: [], ball: [] });
    setDraft(null);
    setMessage("");
    setError("");
  }
  function mark() {
    video.current?.pause();
    setDraft(current?.point ?? { x: 0.5, y: 0.5 });
    setRadius(current?.radius ?? 12);
    setVisible(true);
    setError("");
    setMessage("");
  }
  function save() {
    if (!draft || !video.current || video.current.seeking) return;
    const sample = {
      time: video.current.currentTime,
      point: draft,
      source: "manual" as const,
      similarity: null,
      radius,
    };
    setTracks((previous) => ({
      ...previous,
      [target]: replaceTrackFrom(previous[target], [sample]),
    }));
    setDraft(null);
    setMessage(
      `${OBJECT_LABELS[target]} marked at ${sample.time.toFixed(3)} s. Later points for this target were cleared.`,
    );
  }
  function nudge(dx: number, dy: number) {
    const player = video.current;
    if (player && draft)
      setDraft({
        x: Math.max(0, Math.min(1, draft.x + dx / player.videoWidth)),
        y: Math.max(0, Math.min(1, draft.y + dy / player.videoHeight)),
      });
  }
  async function run() {
    if (!file || !current?.point || controller.current) return;
    video.current?.pause();
    const run = new AbortController();
    controller.current = run;
    setProgress({ fraction: 0, message: "Opening local tracker…" });
    setError("");
    setMessage("");
    try {
      const { trackObject } = await import("@/browser/track-object");
      const result = await trackObject(
        file,
        current,
        seconds,
        run.signal,
        setProgress,
      );
      run.signal.throwIfAborted();
      setTracks((previous) => ({
        ...previous,
        [target]: replaceTrackFrom(previous[target], result),
      }));
      const last = result[result.length - 1];
      seek(last.time);
      setMessage(
        last.source === "lost"
          ? `Tracking lost at ${last.time.toFixed(3)} s. Mark the ${OBJECT_LABELS[target].toLowerCase()} here and follow again.`
          : `Followed to ${last.time.toFixed(3)} s. Check the trail; correct any drift before continuing.`,
      );
    } catch (problem) {
      if (run.signal.aborted)
        setMessage("Tracking cancelled. Previous points are unchanged.");
      else
        setError(
          problem instanceof Error
            ? problem.message
            : "Tracking failed. Try marking again.",
        );
    } finally {
      controller.current = null;
      setProgress(null);
    }
  }
  return {
    tracks,
    target,
    setTarget: (value: ObjectKind) => {
      setTarget(value);
      setMessage("");
      setError("");
    },
    draft,
    setDraft,
    radius,
    setRadius,
    seconds,
    setSeconds,
    visible,
    setVisible,
    progress,
    message,
    error,
    current,
    reset,
    mark,
    save,
    nudge,
    run,
    cancel: () => controller.current?.abort(),
    clear: () => {
      setTracks((p) => ({ ...p, [target]: [] }));
      setDraft(null);
      setMessage("");
      setError("");
    },
  };
}

type Tracker = ReturnType<typeof useObjectTracking>;
const COLORS = { clubhead: "#ffcf69", ball: "#99efb0" };

export function ObjectOverlay({
  tracker: t,
  width,
  height,
  time,
}: {
  tracker: Tracker;
  width: number;
  height: number;
  time: number;
}) {
  if (!width || !height || (!t.visible && !t.draft)) return null;
  return (
    <svg
      className={`pose-overlay object-overlay${t.draft ? " is-picking" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        t.draft
          ? "Tap the target in the video, then adjust and save below"
          : "Clubhead and ball trails"
      }
      onPointerDown={(event) => {
        if (!t.draft) return;
        const box = event.currentTarget.getBoundingClientRect();
        const point = videoPoint(
          event.clientX - box.left,
          event.clientY - box.top,
          box.width,
          box.height,
          width,
          height,
        );
        if (point) {
          t.setDraft(point);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={(event) => {
        if (!t.draft || !event.currentTarget.hasPointerCapture(event.pointerId))
          return;
        const box = event.currentTarget.getBoundingClientRect();
        const point = videoPoint(
          event.clientX - box.left,
          event.clientY - box.top,
          box.width,
          box.height,
          width,
          height,
        );
        if (point) t.setDraft(point);
      }}
    >
      <defs>
        <clipPath id="object-frame">
          <rect width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath="url(#object-frame)">
        {(Object.keys(OBJECT_LABELS) as ObjectKind[]).map((kind) => {
          const sample = objectAt(t.tracks[kind], time);
          return (
            <g key={kind} stroke={COLORS[kind]} fill="none">
              <path
                d={trailPath(t.tracks[kind], time, width, height)}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              {sample?.point && (
                <circle
                  cx={sample.point.x * width}
                  cy={sample.point.y * height}
                  r={Math.max(4, width / 100)}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={
                    sample.source === "manual" ? "3 2" : undefined
                  }
                />
              )}
            </g>
          );
        })}
        {t.draft && (
          <g stroke="white" strokeWidth="1.5" fill="none">
            <rect
              x={t.draft.x * width - t.radius}
              y={t.draft.y * height - t.radius}
              width={t.radius * 2}
              height={t.radius * 2}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={`M${t.draft.x * width - 10},${t.draft.y * height}h20 M${t.draft.x * width},${t.draft.y * height - 10}v20`}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </g>
    </svg>
  );
}

function Magnifier({
  video,
  point,
  radius,
}: {
  video: RefObject<HTMLVideoElement | null>;
  point: Point;
  radius: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const player = video.current,
      ctx = canvas.current?.getContext("2d");
    if (!player || !ctx || player.readyState < 2) return;
    const side = Math.max(32, radius * 3);
    ctx.fillStyle = "#060708";
    ctx.fillRect(0, 0, 112, 112);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      player,
      point.x * player.videoWidth - side / 2,
      point.y * player.videoHeight - side / 2,
      side,
      side,
      0,
      0,
      112,
      112,
    );
    ctx.strokeStyle = "#ffcf69";
    ctx.lineWidth = 1;
    const r = (radius / side) * 112;
    ctx.strokeRect(56 - r, 56 - r, 2 * r, 2 * r);
    ctx.beginPath();
    ctx.moveTo(48, 56);
    ctx.lineTo(64, 56);
    ctx.moveTo(56, 48);
    ctx.lineTo(56, 64);
    ctx.stroke();
  }, [video, point, radius]);
  return (
    <canvas
      ref={canvas}
      width={112}
      height={112}
      className="target-magnifier"
      role="img"
      aria-label="Magnified target; crosshair is the saved point"
    />
  );
}

export function ObjectControls({
  tracker: t,
  video,
  disabled,
  duration,
}: {
  tracker: Tracker;
  video: RefObject<HTMLVideoElement | null>;
  disabled: boolean;
  duration: number;
}) {
  return (
    <details className="object-controls">
      <summary>Club + ball · local assisted tracking</summary>
      <div className="object-toolbar">
        <label>
          Target
          <select
            value={t.target}
            disabled={disabled || !!t.draft}
            onChange={(e) => t.setTarget(e.target.value as ObjectKind)}
          >
            <option value="clubhead">Clubhead</option>
            <option value="ball">Ball</option>
          </select>
        </label>
        <button disabled={disabled || !duration || !!t.draft} onClick={t.mark}>
          Mark / correct point
        </button>
        <label className="inline-control">
          <input
            type="checkbox"
            checked={t.visible}
            onChange={(e) => t.setVisible(e.target.checked)}
          />{" "}
          Trails
        </label>
      </div>
      {t.draft ? (
        <>
          <p className="technical-note">
            Tap or drag onto the target. Include its edge in the box. Use the
            magnifier and arrows, then save. Expand the video for easier
            placement.
          </p>
          <div
            className="target-editor"
            onKeyDown={(e) => {
              const delta: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
              };
              if (delta[e.key] && e.target instanceof HTMLButtonElement) {
                e.preventDefault();
                t.nudge(...delta[e.key]);
              }
            }}
          >
            <Magnifier video={video} point={t.draft} radius={t.radius} />
            <div className="target-adjustments">
              <label>
                Patch size
                <select
                  value={t.radius}
                  onChange={(e) => t.setRadius(Number(e.target.value))}
                >
                  <option value={6}>Small · 13 px</option>
                  <option value={12}>Medium · 25 px</option>
                  <option value={24}>Large · 49 px</option>
                </select>
              </label>
              <div className="object-toolbar">
                <button
                  aria-label="Move target left one pixel"
                  onClick={() => t.nudge(-1, 0)}
                >
                  ←
                </button>
                <button
                  aria-label="Move target up one pixel"
                  onClick={() => t.nudge(0, -1)}
                >
                  ↑
                </button>
                <button
                  aria-label="Move target down one pixel"
                  onClick={() => t.nudge(0, 1)}
                >
                  ↓
                </button>
                <button
                  aria-label="Move target right one pixel"
                  onClick={() => t.nudge(1, 0)}
                >
                  →
                </button>
              </div>
            </div>
          </div>
          <div className="object-toolbar">
            <button className="primary-button" onClick={t.save}>
              Save point
            </button>
            <button onClick={() => t.setDraft(null)}>Cancel point</button>
          </div>
        </>
      ) : (
        <div className="object-toolbar">
          <label>
            Follow for
            <select
              value={t.seconds}
              disabled={disabled}
              onChange={(e) => t.setSeconds(Number(e.target.value))}
            >
              <option value={0.5}>0.5 seconds</option>
              <option value={1}>1 second</option>
              <option value={2}>2 seconds</option>
            </select>
          </label>
          <button disabled={disabled || !t.current?.point} onClick={t.run}>
            Follow {OBJECT_LABELS[t.target].toLowerCase()}
          </button>
          <button
            disabled={disabled || !t.tracks[t.target].length}
            onClick={t.clear}
          >
            Clear target
          </button>
        </div>
      )}
      {t.progress && (
        <div className="progress-area" role="status">
          <span>{t.progress.message}</span>
          <progress
            value={t.progress.fraction}
            max={1}
            aria-label="Object tracking progress"
          />
          <button onClick={t.cancel}>Cancel tracking</button>
        </div>
      )}
      {t.error && (
        <p role="alert" className="message error">
          {t.error}
        </p>
      )}
      {t.message && (
        <p role="status" className="message">
          {t.message}
        </p>
      )}
      <p className="technical-note">
        <span style={{ color: COLORS.clubhead }}>● Clubhead</span> ·{" "}
        <span style={{ color: COLORS.ball }}>● Ball</span> ·{" "}
        {t.current?.source ?? "no point at cursor"}
        {t.current?.similarity != null
          ? ` · match ${t.current.similarity.toFixed(2)} (not a probability)`
          : ""}
      </p>
      <p className="technical-note">
        Mark at the start, follow, then inspect. Corrections replace this target
        from the cursor onward. 60 requested samples/playback second; repeated
        decoded frames are possible. Fast motion, blur or similar objects can
        lose or mislead tracking. This follows a marked patch, not a trained
        club/ball detector.
      </p>
    </details>
  );
}
