import test from "node:test";
import assert from "node:assert/strict";
import { applicationSchema, volunteerSchema, volunteerShiftSchema, pilgrimSchema } from "./validators.js";
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
    parishGroup: "3구역",
    affiliation: "청년부",
    postcode: "06376",
    address: "서울특별시 강남구 헌릉로618길 34",
    addressDetail: "",
    supportFields: ["순례자 환대 및 안내", "외국어 지원"],
    supportLanguage: "English, Español",
    availability: "요일: 평일, 주말 / 시간: 오전, 오후",
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

test("홈스테이 신청서는 순례자 1명만 수용하는 신청을 거부한다", () => {
  const payload = validApplication({ homestay: { ...validApplication().homestay, capacity: 1 } });
  assert.equal(applicationSchema.safeParse(payload).success, false);
});

test("13구역 수동 설정을 허용한다", () => {
  const payload = validApplication({ district: { no: "13", name: "13구역", ban: "13-2", label: "13구역 13-2반" } });
  assert.equal(applicationSchema.safeParse(payload).success, true);
});

test("자원봉사자 신청서는 정상 입력값을 통과시킨다", () => {
  const result = volunteerSchema.safeParse(validVolunteer());
  assert.equal(result.success, true);
});

test("자원봉사자 신청서는 수동 설정 구역반을 허용한다", () => {
  const result = volunteerSchema.safeParse(validVolunteer({
    district: {
      no: "3",
      name: "3구역",
      ban: "3-1",
      label: "3구역 3-1반",
      confidence: "manual",
      reason: "운영자가 주소 기준 매핑을 확인 후 수동 설정"
    }
  }));
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

test("자원봉사자 신청서는 환경 및 시설 관리 지원 분야를 허용한다", () => {
  const payload = validVolunteer({ supportFields: ["환경 및 시설 관리 지원"], supportLanguage: "" });
  assert.equal(volunteerSchema.safeParse(payload).success, true);
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

test("자원봉사자 신청서는 외국어 지원 선택 시 지원 언어가 필요하다", () => {
  const payload = validVolunteer({ supportFields: ["외국어 지원"], supportLanguage: "" });
  assert.equal(volunteerSchema.safeParse(payload).success, false);
});

test("자원봉사자 신청서는 비어 있지 않은 지원 언어를 허용한다", () => {
  const payload = validVolunteer({ supportFields: ["외국어 지원"], supportLanguage: "English" });
  assert.equal(volunteerSchema.safeParse(payload).success, true);
});

test("자원봉사자 신청서는 기존 지원 분야 명칭도 수정 호환성을 유지한다", () => {
  const payload = validVolunteer({
    supportFields: ["행사 진행 및 안내", "통역 및 언어 지원"],
    supportLanguage: "English",
    availability: "주간"
  });
  assert.equal(volunteerSchema.safeParse(payload).success, true);
});

test("봉사 일정은 종료 시각이 시작 시각보다 늦어야 한다", () => {
  const result = volunteerShiftSchema.safeParse({ title: "행사 안내", startAt: "2027-08-03T10:00:00.000Z", endAt: "2027-08-03T09:00:00.000Z", capacity: 20 });
  assert.equal(result.success, false);
});

test("순례자 운영 정보는 식단과 건강 상태를 검증한다", () => {
  const result = pilgrimSchema.safeParse({ name: "김순례", baptismalName: "마리아", gender: "여성", diocese: "서울대교구", region: "강남", grade: "대학생", age: 20, dietType: "비건", feverStatus: "관찰" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.baptismalName, "마리아");
});

test("순례자 세례명은 선택 입력이며 길이를 제한한다", () => {
  const payload = { name: "김순례", gender: "여성", diocese: "서울대교구", region: "강남", grade: "대학생", age: 20, dietType: "일반식" };
  assert.equal(pilgrimSchema.safeParse(payload).success, true);
  assert.equal(pilgrimSchema.safeParse({ ...payload, baptismalName: "가".repeat(81) }).success, false);
});
