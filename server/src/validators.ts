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
const supportFieldSchema = z.enum(["행사 진행 및 안내", "통역 및 언어 지원", "의료 봉사"]);
const availabilitySchema = z.enum(["주간", "야간", "주간,야간 관계 없음"]);

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
  })
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
});

export const volunteerSchema = z.object({
  name: z.string().min(2),
  baptismalName: z.string().optional(),
  gender: genderSchema,
  birthDate: dateSchema,
  phone: phoneSchema,
  email: z.union([z.string().email(), z.literal("")]).optional(),
  postcode: z.string().optional(),
  address: z.string().min(3),
  addressDetail: z.string().optional(),
  supportFields: z.array(supportFieldSchema).min(1),
  supportLanguage: z.string().optional(),
  availability: availabilitySchema,
  experience: z.string().min(2),
  privacyConsent: z.literal(true),
  appliedDate: dateSchema,
  signatureName: z.string().min(2)
});
