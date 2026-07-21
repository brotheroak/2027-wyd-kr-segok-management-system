import test from "node:test";
import assert from "node:assert/strict";
import { matchesIntegratedSearch } from "./search.js";

test("1구역 검색은 11구역을 포함하지 않는다", () => {
  assert.equal(matchesIntegratedSearch(["11구역 11-1반"], "1구역"), false);
  assert.equal(matchesIntegratedSearch(["1구역 1-2반"], "1구역"), true);
});

test("남자와 남성, 여자와 여성은 같은 성별 키워드로 검색된다", () => {
  assert.equal(matchesIntegratedSearch(["남성"], "남자"), true);
  assert.equal(matchesIntegratedSearch(["여자 순례자"], "여성"), true);
});

test("여러 검색어는 모든 단어가 서로 다른 필드에 있어도 검색된다", () => {
  assert.equal(matchesIntegratedSearch(["3구역", "영어", "여성"], "3구역 여성 영어"), true);
});
