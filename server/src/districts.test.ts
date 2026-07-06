import test from "node:test";
import assert from "node:assert/strict";
import { assignDistrict, normalizeDistrictOverride } from "./districts.js";

test("구역반 판별은 리엔파크 4단지 동 번호로 반을 나눈다", () => {
  const result = assignDistrict("서울특별시 강남구 헌릉로590길 88", "406동 1201호");
  assert.equal(result.no, "2");
  assert.equal(result.ban, "2-2");
});

test("구역반 판별은 래미안포레 동 번호로 반을 나눈다", () => {
  const result = assignDistrict("서울특별시 강남구 밤고개로21길 25", "309동 802호");
  assert.equal(result.no, "11");
  assert.equal(result.ban, "11-3");
});

test("구역반 판별은 한양수자인을 12구역으로 처리한다", () => {
  const result = assignDistrict("서울특별시 강남구 자곡로 260", "420동 301호");
  assert.equal(result.no, "12");
  assert.equal(result.ban, "12-4");
});

test("구역반 판별은 아이파크를 8구역 2반으로 처리한다", () => {
  const result = assignDistrict("서울특별시 강남구 자곡로 175", "707동");
  assert.equal(result.no, "8");
  assert.equal(result.ban, "8-2");
});

test("구역반 판별은 방죽1마을 주소 번호로 9구역 반을 나눈다", () => {
  const lower = assignDistrict("서울특별시 강남구 밤고개로24길 42", "");
  assert.equal(lower.no, "9");
  assert.equal(lower.ban, "9-2");

  const upper = assignDistrict("서울특별시 강남구 밤고개로24길 80", "");
  assert.equal(upper.no, "9");
  assert.equal(upper.ban, "9-3");
});

test("구역반 판별 실패 시 99구역 구역외로 처리한다", () => {
  const result = assignDistrict("서울특별시 강남구 테헤란로 123", "1001호");
  assert.equal(result.no, "99");
  assert.equal(result.name, "구역외");
  assert.equal(result.ban, "99-1");
});

test("구역반 수동 선택은 허용된 반으로 저장한다", () => {
  const auto = assignDistrict("서울특별시 강남구 자곡로 260", "420동 301호");
  const result = normalizeDistrictOverride({ no: "12", ban: "12-2" }, auto);
  assert.equal(result.no, "12");
  assert.equal(result.ban, "12-2");
  assert.equal(result.confidence, "manual");
});

test("구역반 수동 선택 반이 잘못되면 해당 구역 기본 반으로 보정한다", () => {
  const auto = assignDistrict("서울특별시 강남구 자곡로 260", "420동 301호");
  const result = normalizeDistrictOverride({ no: "12", ban: "12-99" }, auto);
  assert.equal(result.no, "12");
  assert.equal(result.ban, "12-1");
});
