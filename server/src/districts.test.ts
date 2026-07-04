import test from "node:test";
import assert from "node:assert/strict";
import { assignDistrict } from "./districts.js";

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

test("구역반 판별은 아이파크와 8단지를 8구역 2반으로 처리한다", () => {
  const result = assignDistrict("서울특별시 강남구 자곡로 175", "707동");
  assert.equal(result.no, "8");
  assert.equal(result.ban, "8-2");
});

test("구역반 판별 실패 시 13구역 구역외로 처리한다", () => {
  const result = assignDistrict("서울특별시 강남구 테헤란로 123", "1001호");
  assert.equal(result.no, "13");
  assert.equal(result.name, "구역외");
  assert.equal(result.ban, "13-1");
});
