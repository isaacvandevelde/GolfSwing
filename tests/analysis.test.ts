import test from "node:test";
import assert from "node:assert/strict";
import {
  jointAngle,
  nearestFrame,
  sampleTimes,
  setMarker,
} from "../src/domain/analysis.ts";
import type { Landmark } from "../src/domain/analysis.ts";

const point = (x: number, y: number, visibility = 1): Landmark => ({
  x,
  y,
  z: 0,
  visibility,
});
test("joint angles account for portrait aspect ratio", () => {
  const angle = jointAngle(
    [point(0, 0), point(0, 0.5), point(1, 0)],
    [0, 1, 2],
    100,
    200,
  );
  assert.ok(angle !== null && Math.abs(angle - 45) < 1e-8);
});
test("missing, occluded and degenerate joints are unavailable, not zero", () => {
  assert.equal(jointAngle(null, [0, 1, 2], 100, 100), null);
  assert.equal(
    jointAngle(
      [point(0, 0), point(0, 1, 0.2), point(1, 1)],
      [0, 1, 2],
      100,
      100,
    ),
    null,
  );
  assert.equal(
    jointAngle([point(0, 0), point(0, 0), point(1, 1)], [0, 1, 2], 100, 100),
    null,
  );
  assert.equal(
    jointAngle([point(0, 0), point(0, 1), point(NaN, 1)], [0, 1, 2], 100, 100),
    null,
  );
});
test("a straight joint measures 180 degrees", () => {
  assert.equal(
    jointAngle(
      [point(0, 0), point(0.5, 0.5), point(1, 1)],
      [0, 1, 2],
      100,
      200,
    ),
    180,
  );
});
test("samples are ordered and never seek beyond the clip", () => {
  assert.deepEqual(sampleTimes(0.1, 15), [0, 1 / 15]);
  assert.equal(sampleTimes(20).length, 300);
  assert.throws(() => sampleTimes(Infinity));
  assert.throws(() => sampleTimes(21));
  assert.throws(() => sampleTimes(0));
});
test("overlay does not bridge missing detections or distant samples", () => {
  const frames = [
    { time: 0, landmarks: [point(0, 0)] },
    { time: 1, landmarks: null },
  ];
  assert.equal(nearestFrame(frames, 0.9, 0.2)?.landmarks, null);
  assert.equal(nearestFrame(frames, 0.5, 0.2), null);
  assert.equal(nearestFrame([], 0, 1), null);
});
test("manual phases preserve chronological order", () => {
  assert.deepEqual(setMarker({ address: 0, impact: 2 }, "top", 1), {
    address: 0,
    top: 1,
    impact: 2,
  });
  assert.throws(() => setMarker({ top: 1 }, "address", 1.5));
  assert.throws(() => setMarker({ top: 1 }, "impact", 1));
  assert.throws(() => setMarker({}, "top", NaN));
});
