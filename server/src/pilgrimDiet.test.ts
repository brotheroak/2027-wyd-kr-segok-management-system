import assert from "node:assert/strict";
import test from "node:test";
import { normalizePilgrimLanguage, pilgrimDietGuide, pilgrimLanguages } from "./pilgrimDiet.js";

test("순례자 식단 가이드는 지원 언어마다 먹을 수 있는 음식과 제한 정보를 제공한다", () => {
  for (const language of pilgrimLanguages) {
    const guide = pilgrimDietGuide("비건", language);
    assert.ok(guide.label.length > 0);
    assert.ok(guide.canEat.length > 0);
    assert.ok(guide.avoid.length > 0);
    assert.ok(guide.koreanFood.length > 0);
  }
});

test("알 수 없는 언어와 식단은 안전한 기본값으로 처리한다", () => {
  assert.equal(normalizePilgrimLanguage("unknown"), "en");
  assert.equal(pilgrimDietGuide("unknown", "en").label, "Other diet");
});

test("해외 교구의 영문 식단값도 내부 식단 코드로 정규화한다", () => {
  assert.equal(pilgrimDietGuide("Vegan", "en").label, "Vegan");
  assert.equal(pilgrimDietGuide("lacto-ovo vegetarian", "ko").label, "락토오보 채식");
  assert.equal(pilgrimDietGuide("no_meat", "fr").label, "Sans viande");
});
