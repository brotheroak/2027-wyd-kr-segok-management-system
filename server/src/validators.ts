import { z } from "zod";

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "올바른 날짜를 입력해 주세요.");

const phoneSchema = z.string()
  .min(8)
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, "연락처에는 숫자와 전화번호 기호만 입력할 수 있습니다.")
  .refine((value) => value.replace(/\D/g, "").length >= 8, "연락처 숫자는 8자리 이상이어야 합니다.");

const genderSchema = z.enum(["남성", "여성"]);
const supportFieldSchema = z.enum([
  "순례자 환대 및 안내",
  "행사 운영 지원",
  "환경 및 시설 관리 지원",
  "외국어 지원",
  "의료 지원",
  "어느 분야든 필요에 따라 봉사 가능합니다.",
  // legacy values kept so existing records remain editable
  "행사 진행 및 안내",
  "통역 및 언어 지원",
  "의료 봉사",
  "안전관리"
]);
const availabilitySchema = z.string().min(1).max(120).refine((value) => {
  const trimmed = value.trim();
  if (["주간", "야간", "주간,야간 관계 없음"].includes(trimmed)) return true;
  return /^요일: .+ \/ 시간: .+$/.test(trimmed);
}, "봉사 가능 요일과 시간을 선택해 주세요.");
const districtSchema = z.object({
  no: z.string().regex(/^(?:[1-9]|1[0-2]|99)$/),
  name: z.string().min(1),
  ban: z.string().regex(/^(?:[1-9]|1[0-2]|99)-\d+$/),
  label: z.string().min(1),
  confidence: z.string().optional(),
  reason: z.string().optional()
}).optional();

export const applicationSchema = z.object({
  representative: z.object({
    name: z.string().min(2),
    baptismalName: z.string().optional(),
    gender: genderSchema,
    birthDate: dateSchema,
    phone: phoneSchema,
    email: z.union([z.string().email(), z.literal("")]).optional(),
    applicantPin: z.union([z.string().regex(/^\d{4}$/), z.literal("")]).optional(),
    postcode: z.string().optional(),
    address: z.string().min(3),
    addressDetail: z.string().optional()
  }),
  members: z.array(z.object({
    id: z.string().optional(),
    relationship: z.string().min(1),
    name: z.string().min(2),
    baptismalName: z.string().optional(),
    birthDate: dateSchema,
    gender: genderSchema
  })).min(1),
  homestay: z.object({
    householdTotal: z.number().int().min(1).max(20),
    housingType: z.string().min(1),
    housingTypeOther: z.string().optional(),
    hasPet: z.boolean(),
    petDescription: z.string().optional(),
    languages: z.array(z.string()).min(1),
    preferredGender: z.string().min(1),
    capacity: z.number().int().min(1).max(20),
    hasBed: z.boolean(),
    spaceDescription: z.string().min(10)
  }),
  confirmations: z.object({
    period: z.literal(true),
    breakfast: z.literal(true),
    faithCommunity: z.literal(true),
    appliedDate: dateSchema,
    signatureName: z.string().min(2)
  }),
  district: districtSchema,
  updatedAt: z.string().datetime().optional()
}).refine((data) => {
  if (data.members.length === 0) return true;
  // 1번 구성원은 '가족대표'로 고정
  if (data.members[0].relationship !== "가족대표") return false;
  // 가족대표는 유니크
  const repCount = data.members.filter((m) => m.relationship === "가족대표").length;
  return repCount === 1;
}, {
  message: "1번 구성원은 가족대표여야 하며, 가족대표는 단 한 명만 지정할 수 있습니다.",
  path: ["members"]
}).refine((data) => data.homestay.householdTotal === data.members.length, {
  message: "가족 구성원 수와 가구원 수가 일치해야 합니다.",
  path: ["homestay", "householdTotal"]
}).refine((data) => data.homestay.housingType !== "기타" || Boolean(data.homestay.housingTypeOther?.trim()), {
  message: "기타 주거형태를 입력해 주세요.",
  path: ["homestay", "housingTypeOther"]
}).refine((data) => !data.homestay.hasPet || Boolean(data.homestay.petDescription?.trim()), {
  message: "반려동물이 있는 경우 설명을 입력해 주세요.",
  path: ["homestay", "petDescription"]
});

export const volunteerSchema = z.object({
  name: z.string().min(2),
  baptismalName: z.string().optional(),
  gender: genderSchema,
  birthDate: dateSchema,
  phone: phoneSchema,
  email: z.union([z.string().email(), z.literal("")]).optional(),
  parishGroup: z.string().max(80).optional(),
  affiliation: z.string().max(120).optional(),
  postcode: z.string().optional(),
  address: z.string().min(3),
  addressDetail: z.string().optional(),
  supportFields: z.array(supportFieldSchema).min(1),
  supportLanguage: z.string().optional(),
  availability: availabilitySchema,
  experience: z.string().min(2),
  privacyConsent: z.literal(true),
  appliedDate: dateSchema,
  signatureName: z.string().min(2),
  district: districtSchema,
  updatedAt: z.string().datetime().optional()
}).refine((data) => !data.supportFields.some((field) => field === "외국어 지원" || field === "통역 및 언어 지원") || Boolean(data.supportLanguage?.trim()), {
  message: "외국어 지원을 선택한 경우 지원 언어를 입력해 주세요.",
  path: ["supportLanguage"]
});
