import test from "node:test";
import assert from "node:assert/strict";
import { applicationSchema, volunteerSchema } from "./validators.js";
import type { ApplicationPayload, VolunteerPayload } from "./types.js";

function validApplication(overrides: Partial<ApplicationPayload> = {}): ApplicationPayload {
  const base: ApplicationPayload = {
    representative: {
      name: "홍길동",
      baptismalName: "요셉",
      gender: "남성",
      birthDate: "1980-05-20",
      phone: "010-1234-5678",
      email: "host@example.com",
      applicantPin: "1234",
      postcode: "06376",
      address: "서울특별시 강남구 헌릉로618길 34",
      addressDetail: "101동 101호"
    },
    members: [
      {
        relationship: "가족대표",
        name: "홍길동",
        baptismalName: "요셉",
        birthDate: "1980-05-20",
        gender: "남성"
      }
    ],
    homestay: {
      householdTotal: 1,
      housingType: "아파트",
      housingTypeOther: "",
      hasPet: false,
      petDescription: "",
      languages: ["한국어"],
      preferredGender: "상관없음",
      capacity: 2,
      hasBed: true,
      spaceDescription: "순례자 두 명이 머물 수 있는 독립 방이 있습니다."
    },
    confirmations: {
      period: true,
      breakfast: true,
      faithCommunity: true,
      appliedDate: "2026-07-04",
      signatureName: "홍길동 (요셉)"
    }
  };
  return { ...base, ...overrides };
}

function validVolunteer(overrides: Partial<VolunteerPayload> = {}): VolunteerPayload {
  const base: VolunteerPayload = {
    name: "김마리아",
    baptismalName: "마리아",
    gender: "여성",
    birthDate: "1990-03-15",
    phone: "010-2222-3333",
    email: "volunteer@example.com",
    postcode: "06376",
    address: "서울특별시 강남구 헌릉로618길 34",
    addressDetail: "",
    supportFields: ["행사 진행 및 안내", "통역 및 언어 지원"],
    supportLanguage: "English, Español",
    availability: "주간,야간 관계 없음",
    experience: "본당 행사 안내 봉사 경험이 있습니다.",
    privacyConsent: true,
    appliedDate: "2026-07-04",
    signatureName: "김마리아 (마리아)"
  };
  return { ...base, ...overrides };
}

test("홈스테이 신청서는 정상 입력값을 통과시킨다", () => {
  const result = applicationSchema.safeParse(validApplication());
  assert.equal(result.success, true);
});

test("홈스테이 신청서는 4자리 신청 확인 PIN만 허용한다", () => {
  const payload = validApplication({
    representative: {
      ...validApplication().representative,
      applicantPin: "12ab"
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서는 실제 날짜 형식만 허용한다", () => {
  const payload = validApplication({
    representative: {
      ...validApplication().representative,
      birthDate: "2026-13-40"
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서는 숫자가 아닌 연락처를 거부한다", () => {
  const payload = validApplication({
    representative: {
      ...validApplication().representative,
      phone: "전화번호입니다"
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서는 수용 가능 인원을 20명 이하로 제한한다", () => {
  const payload = validApplication({
    homestay: {
      ...validApplication().homestay,
      capacity: 21
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("자원봉사자 신청서는 정상 입력값을 통과시킨다", () => {
  const result = volunteerSchema.safeParse(validVolunteer());
  assert.equal(result.success, true);
});

test("자원봉사자 신청서는 개인정보 동의가 필수다", () => {
  const payload = validVolunteer({ privacyConsent: false });
  assert.equal(volunteerSchema.safeParse(payload).success, false);
});

test("자원봉사자 신청서는 정의되지 않은 지원 분야를 거부한다", () => {
  const payload = validVolunteer({ supportFields: ["기타 지원"] });
  assert.equal(volunteerSchema.safeParse(payload).success, false);
});

test("자원봉사자 신청서는 정의된 활동 가능 시간만 허용한다", () => {
  const payload = validVolunteer({ availability: "주말만 가능" });
  assert.equal(volunteerSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서에서 1번 구성원은 가족대표여야 한다", () => {
  const payload = validApplication({
    members: [
      {
        relationship: "자녀",
        name: "홍길동",
        baptismalName: "요셉",
        birthDate: "1980-05-20",
        gender: "남성"
      }
    ]
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서에서 가족대표는 중복(유니크) 지정할 수 없다", () => {
  const payload = validApplication({
    members: [
      {
        relationship: "가족대표",
        name: "홍길동",
        baptismalName: "요셉",
        birthDate: "1980-05-20",
        gender: "남성"
      },
      {
        relationship: "가족대표",
        name: "김영희",
        baptismalName: "",
        birthDate: "1982-08-15",
        gender: "여성"
      }
    ]
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서는 가족 구성원 수와 가구원 수가 일치해야 한다", () => {
  const payload = validApplication({
    homestay: {
      ...validApplication().homestay,
      householdTotal: 2
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서는 기타 주거형태 선택 시 상세 입력이 필요하다", () => {
  const payload = validApplication({
    homestay: {
      ...validApplication().homestay,
      housingType: "기타",
      housingTypeOther: " "
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("홈스테이 신청서는 반려동물이 있으면 설명이 필요하다", () => {
  const payload = validApplication({
    homestay: {
      ...validApplication().homestay,
      hasPet: true,
      petDescription: ""
    }
  });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("자원봉사자 신청서는 통역 지원 선택 시 지원 언어가 필요하다", () => {
  const payload = validVolunteer({ supportFields: ["통역 및 언어 지원"], supportLanguage: "" });
  assert.equal(volunteerSchema.safeParse(payload).success, false);
});

test("자원봉사자 신청서는 비어 있지 않은 지원 언어를 허용한다", () => {
  const payload = validVolunteer({ supportFields: ["통역 및 언어 지원"], supportLanguage: "English" });
  assert.equal(volunteerSchema.safeParse(payload).success, true);
});
