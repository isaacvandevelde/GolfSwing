import test from "node:test";
import assert from "node:assert/strict";
import {
  jointAngle,
  headDisplacement,
  metricValue,
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

test("head displacement uses pixel aspect ratio and address as reference", () => {
  const origin = [point(0.2, 0.3)];
  const moved = [point(0.6, 0.45)];
  assert.ok(Math.abs(headDisplacement(moved, origin, 100, 200)! - 25) < 1e-8);
  assert.equal(headDisplacement(origin, origin, 100, 200), 0);
  assert.equal(
    metricValue("headMovement", moved, 100, 200, origin),
    headDisplacement(moved, origin, 100, 200),
  );
  assert.equal(metricValue("leftElbow", null, 100, 200, origin), null);
});
test("head movement never invents a baseline or fills missing tracking", () => {
  const valid = [point(0.2, 0.3)];
  for (const missing of [
    null,
    [],
    [point(0.2, 0.3, 0.1)],
    [point(NaN, 0.3)],
    [{ ...point(0.2, 0.3), presence: 0.1 }],
  ]) {
    assert.equal(headDisplacement(valid, missing, 100, 200), null);
    assert.equal(headDisplacement(missing, valid, 100, 200), null);
  }
  for (const size of [0, -1, NaN, Infinity]) {
    assert.equal(headDisplacement(valid, valid, size, 200), null);
    assert.equal(headDisplacement(valid, valid, 100, size), null);
  }
  const frames = [
    { time: 0, landmarks: valid },
    { time: 1, landmarks: null },
  ];
  const reference = nearestFrame(frames, 1, 0.05)?.landmarks ?? null;
  assert.equal(headDisplacement(valid, reference, 100, 200), null);
});
