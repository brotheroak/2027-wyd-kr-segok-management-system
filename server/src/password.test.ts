import test from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { hashPassword, passwordIterations, verifyPassword } from "./password.js";

test("관리자 비밀번호 해시는 원문을 포함하지 않고 강화된 PBKDF2 포맷을 사용한다", () => {
  const stored = hashPassword("StrongPassword123!");
  const parts = stored.split("$");

  assert.equal(parts[0], "pbkdf2-sha512");
  assert.equal(Number(parts[1]), passwordIterations);
  assert.equal(parts.length, 4);
  assert.equal(stored.includes("StrongPassword123!"), false);
});

test("관리자 비밀번호 검증은 올바른 비밀번호만 통과시킨다", () => {
  const stored = hashPassword("StrongPassword123!");

  assert.equal(verifyPassword("StrongPassword123!", stored), true);
  assert.equal(verifyPassword("WrongPassword123!", stored), false);
});

test("기존 1000회 PBKDF2 레거시 해시는 로그인 호환성을 유지한다", () => {
  const salt = "00112233445566778899aabbccddeeff";
  const hash = pbkdf2Sync("legacy-password", salt, 1000, 64, "sha512").toString("hex");
  const stored = `${salt}:${hash}`;

  assert.equal(verifyPassword("legacy-password", stored), true);
  assert.equal(verifyPassword("wrong-password", stored), false);
});

test("잘못된 비밀번호 해시 포맷은 실패한다", () => {
  assert.equal(verifyPassword("password", ""), false);
  assert.equal(verifyPassword("password", "not-a-valid-hash"), false);
  assert.equal(verifyPassword("password", "pbkdf2-sha512$999$00$00"), false);
});
