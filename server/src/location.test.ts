import assert from "node:assert/strict";
import test from "node:test";
import { haversineMeters, validCoordinates, validateAttendanceLocation } from "./location.js";

const segok = { latitude: 37.4664, longitude: 127.1076 };

test("validCoordinates rejects coordinates outside the earth bounds", () => {
  assert.equal(validCoordinates(segok), true);
  assert.equal(validCoordinates({ latitude: 91, longitude: 127 }), false);
  assert.equal(validCoordinates({ latitude: 37, longitude: 181 }), false);
});

test("haversineMeters returns zero for the same point and a realistic nearby distance", () => {
  assert.equal(haversineMeters(segok, segok), 0);
  const distance = haversineMeters(segok, { latitude: 37.4673, longitude: 127.1076 });
  assert.ok(distance > 95 && distance < 105);
});

test("attendance location accepts a precise device inside the checkpoint radius", () => {
  const result = validateAttendanceLocation(
    { ...segok, radiusM: 150 },
    { latitude: 37.4673, longitude: 127.1076, accuracyM: 12 }
  );
  assert.equal(result.accepted, true);
});

test("attendance location rejects a device outside the checkpoint radius", () => {
  const result = validateAttendanceLocation(
    { ...segok, radiusM: 50 },
    { latitude: 37.4673, longitude: 127.1076, accuracyM: 12 }
  );
  assert.equal(result.accepted, false);
  assert.match(result.reason, /떨어져/);
});

test("attendance location rejects inaccurate geolocation readings", () => {
  const result = validateAttendanceLocation(
    { ...segok, radiusM: 500 },
    { ...segok, accuracyM: 250 }
  );
  assert.equal(result.accepted, false);
  assert.match(result.reason, /정확도/);
});
