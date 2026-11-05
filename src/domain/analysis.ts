export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence?: number;
};
export type PoseFrame = { time: number; landmarks: Landmark[] | null };
export type Analysis = {
  version: 1;
  model: string;
  duration: number;
  width: number;
  height: number;
  sampleRate: number;
  processingSeconds: number;
  frames: PoseFrame[];
};

export const MAX_DURATION = 20;
export const MAX_BYTES = 150 * 1024 * 1024;
export const SAMPLE_RATE = 15;
export const MODEL = "MediaPipe Pose Landmarker Lite float16 v1";
export const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [27, 31],
  [28, 30],
  [30, 32],
  [28, 32],
];

export function reliable(point: Landmark | undefined): point is Landmark {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.visibility >= 0.5 &&
    (point.presence === undefined || point.presence >= 0.5)
  );
}

// Normalize in pixel space: x and y have different scales on portrait video.
export function jointAngle(
  points: Landmark[] | null,
  indices: [number, number, number],
  width: number,
  height: number,
): number | null {
  if (!points || width <= 0 || height <= 0) return null;
  const [a, b, c] = indices.map((index) => points[index]);
  if (!reliable(a) || !reliable(b) || !reliable(c)) return null;
  const u = [(a.x - b.x) * width, (a.y - b.y) * height];
  const v = [(c.x - b.x) * width, (c.y - b.y) * height];
  const length = Math.hypot(...u) * Math.hypot(...v);
  if (length < 1e-8) return null;
  return (
    (Math.acos(
      Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / length)),
    ) *
      180) /
    Math.PI
  );
}

export const METRICS = {
  leftElbow: {
    label: "Left elbow",
    joints: [11, 13, 15] as [number, number, number],
  },
  rightElbow: {
    label: "Right elbow",
    joints: [12, 14, 16] as [number, number, number],
  },
  leftKnee: {
    label: "Left knee",
    joints: [23, 25, 27] as [number, number, number],
  },
  rightKnee: {
    label: "Right knee",
    joints: [24, 26, 28] as [number, number, number],
  },
};
export type Metric = keyof typeof METRICS;

export function nearestFrame(
  frames: PoseFrame[],
  time: number,
  tolerance: number,
): PoseFrame | null {
  let nearest: PoseFrame | null = null;
  for (const frame of frames) {
    if (!nearest || Math.abs(frame.time - time) < Math.abs(nearest.time - time))
      nearest = frame;
  }
  return nearest && Math.abs(nearest.time - time) <= tolerance ? nearest : null;
}

export function sampleTimes(duration: number, rate = SAMPLE_RATE): number[] {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_DURATION ||
    !Number.isFinite(rate) ||
    rate <= 0
  )
    throw new Error("Use a video between 0 and 20 seconds long.");
  return Array.from({ length: Math.ceil(duration * rate) }, (_, i) => i / rate);
}

export type Markers = Partial<Record<"address" | "top" | "impact", number>>;
export function setMarker(
  markers: Markers,
  name: keyof Markers,
  time: number,
): Markers {
  if (!Number.isFinite(time) || time < 0)
    throw new Error("Choose a valid video time.");
  const next = { ...markers, [name]: time };
  const ordered = [next.address, next.top, next.impact].filter(
    (x): x is number => x !== undefined,
  );
  if (ordered.some((x, i) => i > 0 && x <= ordered[i - 1]))
    throw new Error(
      "Keep address before top, and top before impact. Clear markers to start again.",
    );
  return next;
}
