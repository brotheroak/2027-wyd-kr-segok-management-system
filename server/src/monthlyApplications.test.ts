import test from "node:test";
import assert from "node:assert/strict";
import { monthlyApplicationCounts } from "./monthlyApplications.js";

test("monthly counts use the original registration date and Korea month boundaries", () => {
  assert.deepEqual(monthlyApplicationCounts([
    { createdAt: "2026-09-30T14:59:59Z", status: "submitted" },
    { createdAt: "2026-09-30T15:00:00Z", status: "confirmed" },
    { createdAt: "2026-10-15T12:00:00+09:00", status: "canceled" },
    { createdAt: "2025-12-31T15:00:00Z", status: "submitted" },
  ]), [
    { month: "2026-01", total: 1, active: 1, canceled: 0 },
    { month: "2026-09", total: 1, active: 1, canceled: 0 },
    { month: "2026-10", total: 2, active: 1, canceled: 1 },
  ]);
});
test("empty and invalid dates do not create fabricated months", () => {
  assert.deepEqual(monthlyApplicationCounts([]), []);
  assert.deepEqual(monthlyApplicationCounts([{ createdAt: "invalid", status: "submitted" }]), []);
});
test("changing approval or cancellation status keeps the original application month", () => {
  const record = { createdAt: "2026-07-20T01:00:00Z", status: "submitted", updatedAt: "2026-10-03T00:00:00Z" };
  assert.deepEqual(monthlyApplicationCounts([record]), [{ month: "2026-07", total: 1, active: 1, canceled: 0 }]);
  assert.deepEqual(monthlyApplicationCounts([{ ...record, status: "canceled" }]), [{ month: "2026-07", total: 1, active: 0, canceled: 1 }]);
});
