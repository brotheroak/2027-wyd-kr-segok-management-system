import test from "node:test";
import assert from "node:assert/strict";
import { paperSourceMismatchIds } from "./submissionSources.js";

test("종이 등록 감사 이력이 있는 접수 경로 불일치 건만 선택한다", () => {
  const result = paperSourceMismatchIds(
    ["paper-old", "paper-current", null],
    [
      { id: "paper-old", submissionSource: "online" },
      { id: "paper-current", submissionSource: "paper" },
      { id: "online", submissionSource: "online" }
    ]
  );
  assert.deepEqual(result, ["paper-old"]);
});

test("감사 이력이 없으면 기존 접수 경로를 변경 대상으로 삼지 않는다", () => {
  assert.deepEqual(paperSourceMismatchIds([], [{ id: "online", submissionSource: "online" }]), []);
});
