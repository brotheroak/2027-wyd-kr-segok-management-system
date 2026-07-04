import test from "node:test";
import assert from "node:assert/strict";

async function loadCrypto(key?: string) {
  if (key === undefined) {
    delete process.env.DATA_ENCRYPTION_KEY;
  } else {
    process.env.DATA_ENCRYPTION_KEY = key;
  }
  return import(`./crypto.js?test=${Date.now()}-${Math.random()}`);
}

test("암호화 키가 있으면 개인정보 문자열을 AES-GCM 형식으로 암호화하고 복호화한다", async () => {
  const key = Buffer.alloc(32, 7).toString("base64");
  const crypto = await loadCrypto(key);

  const encrypted = crypto.encryptText("홍길동");
  assert.notEqual(encrypted, "홍길동");
  assert.match(encrypted, /^enc:v1:/);
  assert.equal(crypto.decryptText(encrypted), "홍길동");
});

test("이미 암호화된 값은 중복 암호화하지 않는다", async () => {
  const key = Buffer.alloc(32, 8).toString("base64");
  const crypto = await loadCrypto(key);

  const encrypted = crypto.encryptText("010-1234-5678");
  assert.equal(crypto.encryptText(encrypted), encrypted);
});

test("암호화 키가 없으면 평문 저장 모드이고 암호문 복호화는 빈 값으로 처리한다", async () => {
  const crypto = await loadCrypto();

  assert.equal(crypto.encryptionEnabled(), false);
  assert.equal(crypto.encryptText("plain"), "plain");
  assert.equal(crypto.decryptText("enc:v1:not-real"), "");
});

test("운영 환경에서는 암호화 키가 없으면 시작을 차단한다", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const crypto = await loadCrypto();

  assert.throws(() => crypto.requireEncryptionKeyInProduction(), /DATA_ENCRYPTION_KEY/);
  process.env.NODE_ENV = originalNodeEnv;
});
