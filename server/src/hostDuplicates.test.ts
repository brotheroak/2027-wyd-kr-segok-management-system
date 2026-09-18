import test from "node:test";
import assert from "node:assert/strict";
import { isDuplicateHost } from "./hostDuplicates.js";

const host = { name: "홍길동", phone: "010-1234-5678", address: "서울특별시 강남구 밤고개로27길 7", addressDetail: "101동 201호" };

test("same phone blocks repeat registration despite changed name or address", () => {
  assert.equal(isDuplicateHost(host, { ...host, name: "다른이름", address: "다른주소", phone: "+82 10 1234 5678" }), true);
});
test("same name and full address blocks repeat registration with a new phone", () => {
  assert.equal(isDuplicateHost(host, { ...host, name: " 홍 길 동 ", address: "서울특별시강남구밤고개로27길7", addressDetail: "101동201호", phone: "01099998888" }), true);
});
test("same name with a different phone and apartment is not sufficient", () => {
  assert.equal(isDuplicateHost(host, { ...host, addressDetail: "101동 202호", phone: "01099998888" }), false);
});
test("empty identifiers do not identify a duplicate", () => {
  assert.equal(isDuplicateHost({name:"",phone:"",address:""}, {name:"",phone:"",address:""}), false);
});
