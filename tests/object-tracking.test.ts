import test from "node:test";
import assert from "node:assert/strict";
import {
  makeTemplate,
  matchTemplate,
  trackingTimes,
  videoPoint,
  objectAt,
  replaceTrackFrom,
  trailPath,
} from "../src/domain/object-tracking.ts";
import type { GrayImage, ObjectSample } from "../src/domain/object-tracking.ts";

function scene(centers: { x: number; y: number }[], brightness = 0): GrayImage {
  const width = 180,
    height = 120;
  const data = new Uint8Array(width * height).fill(25 + brightness);
  for (const center of centers) {
    for (let y = -6; y <= 6; y++)
      for (let x = -6; x <= 6; x++) {
        if (x * x + y * y <= 36)
          data[(center.y + y) * width + center.x + x] =
            (x < 0 ? 150 : 220) + brightness;
      }
  }
  return { width, height, data };
}

test("local patch tracker follows a translated target despite brightness changes", () => {
  const template = makeTemplate(scene([{ x: 50, y: 50 }]), 50, 50, 12);
  const result = matchTemplate(scene([{ x: 77, y: 61 }], 20), template);
  assert.ok(result);
  assert.equal(result.x, 77);
  assert.equal(result.y, 61);
  assert.ok(result.similarity > 0.99);
});

test("missing and ambiguous objects stop tracking instead of inventing a position", () => {
  const template = makeTemplate(scene([{ x: 50, y: 50 }]), 50, 50, 12);
  assert.equal(matchTemplate(scene([]), template), null);
  assert.equal(
    matchTemplate(
      scene([
        { x: 60, y: 50 },
        { x: 110, y: 80 },
      ]),
      template,
    ),
    null,
  );
});

test("uniform, clipped and invalid seed patches fail with actionable errors", () => {
  assert.throws(() => makeTemplate(scene([]), 50, 50, 12), /little detail/);
  assert.throws(() => makeTemplate(scene([]), 3, 50, 12), /inside the video/);
  assert.throws(() => makeTemplate(scene([]), NaN, 50, 12));
  assert.throws(() => makeTemplate(scene([]), 50, 50, 1000));
  assert.throws(
    () =>
      makeTemplate(
        { width: 20, height: 20, data: new Uint8Array(1) },
        10,
        10,
        4,
      ),
    /Invalid/,
  );
});

test("dense requests are bounded to two seconds and never request the end of the clip", () => {
  const times = trackingTimes(1, 5, 2);
  assert.equal(times.length, 121);
  assert.equal(times[0], 1);
  assert.equal(times.at(-1), 3);
  assert.ok(trackingTimes(1.9, 2, 2).every((t) => t < 2));
  for (const args of [
    [0, 2, 3],
    [2, 2, 1],
    [-1, 2, 1],
    [0, Infinity, 1],
    [NaN, 2, 1],
  ])
    assert.throws(() => trackingTimes(...(args as [number, number, number])));
});

test("touch coordinates exclude letterboxing in portrait and landscape", () => {
  assert.deepEqual(videoPoint(200, 200, 400, 400, 200, 400), {
    x: 0.5,
    y: 0.5,
  });
  assert.equal(videoPoint(50, 200, 400, 400, 200, 400), null);
  assert.deepEqual(videoPoint(100, 150, 400, 400, 400, 200), {
    x: 0.25,
    y: 0.25,
  });
  assert.equal(videoPoint(100, 50, 400, 400, 400, 200), null);
  assert.equal(videoPoint(1, 1, 0, 400, 200, 400), null);
});

const sample = (
  time: number,
  source: ObjectSample["source"] = "tracked",
): ObjectSample => ({
  time,
  point: source === "lost" ? null : { x: 0.4, y: 0.6 },
  source,
  similarity: source === "tracked" ? 0.9 : null,
  radius: 12,
});
test("corrections discard dependent future points without bridging gaps", () => {
  const samples = [
    sample(0, "manual"),
    sample(1 / 60),
    sample(2 / 60, "lost"),
    sample(1, "manual"),
    sample(1 + 1 / 60),
  ];
  assert.equal(objectAt(samples, 2 / 60)?.point, null);
  assert.equal(objectAt(samples, 0.5), null);
  assert.equal(objectAt(samples, 2), null);
  const path = trailPath(samples, 2, 200, 100);
  assert.equal((path.match(/M/g) ?? []).length, 2);
  assert.equal((path.match(/L/g) ?? []).length, 2);
  const corrected = replaceTrackFrom(samples, [sample(1 / 60, "manual")]);
  assert.equal(corrected.length, 2);
  assert.equal(corrected[1].source, "manual");
  assert.equal((trailPath(corrected, 1, 200, 100).match(/L/g) ?? []).length, 0);
  assert.deepEqual(replaceTrackFrom(samples, []), samples);
});
