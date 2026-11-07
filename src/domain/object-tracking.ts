export type Point = { x: number; y: number };
export type ObjectKind = "clubhead" | "ball";
export type ObjectSample = {
  time: number;
  point: Point | null;
  source: "manual" | "tracked" | "lost";
  similarity: number | null;
  radius: number;
};
export type ObjectTracks = Record<ObjectKind, ObjectSample[]>;
export const TRACK_RATE = 60;
export const OBJECT_LABELS = { clubhead: "Clubhead", ball: "Ball" };

export function trackingTimes(
  start: number,
  duration: number,
  seconds: number,
) {
  if (
    ![start, duration, seconds].every(Number.isFinite) ||
    start < 0 ||
    start >= duration ||
    duration > 20 ||
    seconds <= 0 ||
    seconds > 2
  )
    throw new Error(
      "Select a start inside the clip and track up to two seconds.",
    );
  const end = Math.min(duration - 0.001, start + seconds);
  return Array.from(
    { length: Math.floor((end - start) * TRACK_RATE) + 1 },
    (_, i) => start + i / TRACK_RATE,
  );
}

export function objectAt(samples: ObjectSample[], time: number) {
  let nearest: ObjectSample | null = null;
  for (const sample of samples)
    if (
      !nearest ||
      Math.abs(sample.time - time) < Math.abs(nearest.time - time)
    )
      nearest = sample;
  return nearest && Math.abs(nearest.time - time) <= 0.5 / TRACK_RATE + 1e-6
    ? nearest
    : null;
}

// A correction invalidates the dependent future, including old manual points.
export function replaceTrackFrom(
  samples: ObjectSample[],
  replacement: ObjectSample[],
) {
  if (!replacement.length) return samples;
  return [
    ...samples.filter((s) => s.time < replacement[0].time - 1e-6),
    ...replacement,
  ];
}

export function trailPath(
  samples: ObjectSample[],
  time: number,
  width: number,
  height: number,
) {
  let path = "";
  let previous: ObjectSample | null = null;
  for (const s of samples) {
    if (s.time > time + 1e-6) break;
    if (!s.point || s.time < time - 2) {
      previous = null;
      continue;
    }
    const connected =
      previous?.point &&
      s.time - previous.time <= 1.5 / TRACK_RATE &&
      s.source !== "manual";
    path += `${connected ? "L" : "M"}${(s.point.x * width).toFixed(2)},${(s.point.y * height).toFixed(2)} `;
    previous = s;
  }
  return path;
}

// Match object-fit: contain / SVG xMidYMid meet, excluding letterboxed bars.
export function videoPoint(
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  width: number,
  height: number,
): Point | null {
  if (
    ![x, y, boxWidth, boxHeight, width, height].every(Number.isFinite) ||
    Math.min(boxWidth, boxHeight, width, height) <= 0
  )
    return null;
  const scale = Math.min(boxWidth / width, boxHeight / height);
  const px = (x - (boxWidth - width * scale) / 2) / (width * scale);
  const py = (y - (boxHeight - height * scale) / 2) / (height * scale);
  return px >= 0 && px <= 1 && py >= 0 && py <= 1 ? { x: px, y: py } : null;
}

export type GrayImage = { data: Uint8Array; width: number; height: number };
export type Template = { values: Float32Array; norm: number; radius: number };
const GRID = 13;

function validateImage(image: GrayImage) {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.width > 512 ||
    image.height > 512 ||
    image.data.length !== image.width * image.height
  )
    throw new Error("Invalid tracking crop.");
}

export function makeTemplate(
  image: GrayImage,
  x: number,
  y: number,
  radius: number,
): Template {
  validateImage(image);
  if (
    !Number.isInteger(radius) ||
    radius < 4 ||
    radius > 32 ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < radius ||
    y < radius ||
    x + radius >= image.width ||
    y + radius >= image.height
  )
    throw new Error(
      "Keep the target patch inside the video. Move the point or use a smaller patch.",
    );
  const values = new Float32Array(GRID * GRID);
  let sum = 0;
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const value =
        image.data[
          (y + Math.round(((j / (GRID - 1)) * 2 - 1) * radius)) * image.width +
            x +
            Math.round(((i / (GRID - 1)) * 2 - 1) * radius)
        ];
      values[j * GRID + i] = value;
      sum += value;
    }
  const mean = sum / values.length;
  let variance = 0;
  for (let i = 0; i < values.length; i++) {
    values[i] -= mean;
    variance += values[i] ** 2;
  }
  if (variance / values.length < 36)
    throw new Error(
      "Too little detail in this patch. Include the object's edge and some background.",
    );
  return { values, norm: Math.sqrt(variance), radius };
}

// Fixed appearance avoids learning background after a missed detection.
// shortcut: translation-only matching loses rotation/blur; benchmark a trained detector before replacing it.
export function matchTemplate(
  image: GrayImage,
  template: Template,
): { x: number; y: number; similarity: number } | null {
  validateImage(image);
  const { radius, values, norm } = template;
  const offsets: number[] = [];
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++)
      offsets.push(
        Math.round(((j / (GRID - 1)) * 2 - 1) * radius) * image.width +
          Math.round(((i / (GRID - 1)) * 2 - 1) * radius),
      );
  function score(x: number, y: number) {
    let sum = 0,
      squares = 0,
      dot = 0;
    const center = y * image.width + x;
    for (let i = 0; i < offsets.length; i++) {
      const v = image.data[center + offsets[i]];
      sum += v;
      squares += v * v;
      dot += v * values[i];
    }
    const variance = squares - (sum * sum) / offsets.length;
    return variance > 1 ? dot / (norm * Math.sqrt(variance)) : -1;
  }
  const candidates: { x: number; y: number; similarity: number }[] = [];
  let best = { x: radius, y: radius, similarity: -1 };
  for (let y = radius; y < image.height - radius; y += 2)
    for (let x = radius; x < image.width - radius; x += 2) {
      const candidate = { x, y, similarity: score(x, y) };
      candidates.push(candidate);
      if (candidate.similarity > best.similarity) best = candidate;
    }
  const coarse = best;
  for (
    let y = Math.max(radius, coarse.y - 2);
    y <= Math.min(image.height - radius - 1, coarse.y + 2);
    y++
  )
    for (
      let x = Math.max(radius, coarse.x - 2);
      x <= Math.min(image.width - radius - 1, coarse.x + 2);
      x++
    ) {
      const similarity = score(x, y);
      if (similarity > best.similarity) best = { x, y, similarity };
    }
  const ambiguous = candidates.some(
    (c) =>
      Math.hypot(c.x - best.x, c.y - best.y) > Math.max(4, radius) &&
      c.similarity > best.similarity - 0.08,
  );
  return best.similarity >= 0.72 && !ambiguous
    ? { ...best, similarity: Math.min(1, best.similarity) }
    : null;
}
