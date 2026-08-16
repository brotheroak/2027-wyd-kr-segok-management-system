import test from "node:test";
import assert from "node:assert/strict";
import { managedDistrictNumbers, parseDistrictTargets } from "./districtTargets.js";

test("구역별 목표값은 1~12구역의 정수로 정규화한다", () => {
  const result = parseDistrictTargets({ "1": 20, "10": "15" });
  assert.deepEqual(Object.keys(result), managedDistrictNumbers);
  assert.equal(result["1"], 20);
  assert.equal(result["10"], 15);
  assert.equal(result["12"], 0);
});

test("구역별 목표값에 음수나 소수가 있으면 전체 저장을 거부한다", () => {
  assert.throws(() => parseDistrictTargets({ "1": -1 }), /0~10,000/);
  assert.throws(() => parseDistrictTargets({ "1": 1.5 }), /0~10,000/);
});

test("구역별 목표값이 객체가 아니면 저장을 거부한다", () => {
  assert.throws(() => parseDistrictTargets(null), /형식이 올바르지 않습니다/);
  assert.throws(() => parseDistrictTargets([]), /형식이 올바르지 않습니다/);
});
