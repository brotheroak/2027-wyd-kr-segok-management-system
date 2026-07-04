import { ApplicationPayload, VolunteerPayload } from "../types.js";

export const today = new Date().toISOString().slice(0, 10);

export const languages = ["한국어", "English", "Español", "Français", "Italiano", "Português", "日本語", "中文", "기타"];

export const chartColors = ["#c5a85c", "#121e31", "#8a1c14", "#4f694e", "#d9c17d"];

export const birthYears = Array.from({ length: 101 }, (_, index) => String(new Date().getFullYear() - index));

export const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

export const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

export const volunteerFields = [
  "행사 진행 및 안내",
  "통역 및 언어 지원",
  "의료 봉사"
];

export const volunteerLanguageOptions = ["English", "Español", "Français", "Italiano", "Português", "日本語", "中文"];

export const availabilityOptions = ["주간", "야간", "주간,야간 관계 없음"];

export const emptyApplication = (email = ""): ApplicationPayload => ({
  representative: {
    name: "",
    baptismalName: "",
    gender: "",
    birthDate: "",
    phone: "",
    email,
    applicantPin: "",
    postcode: "",
    address: "",
    addressDetail: ""
  },
  members: [
    { relationship: "가족대표", name: "", baptismalName: "", birthDate: "", gender: "" }
  ],
  homestay: {
    householdTotal: 1,
    housingType: "아파트",
    housingTypeOther: "",
    hasPet: false,
    petDescription: "",
    languages: ["한국어"],
    preferredGender: "상관없음",
    capacity: 1,
    hasBed: false,
    spaceDescription: ""
  },
  confirmations: {
    period: false,
    breakfast: false,
    faithCommunity: false,
    appliedDate: today,
    signatureName: ""
  }
});

export const emptyVolunteer = (): VolunteerPayload => ({
  name: "",
  baptismalName: "",
  gender: "",
  birthDate: "",
  phone: "",
  email: "",
  postcode: "",
  address: "",
  addressDetail: "",
  supportFields: [],
  supportLanguage: "",
  availability: "",
  experience: "",
  privacyConsent: false,
  appliedDate: today,
  signatureName: ""
});

export const splitVolunteerLanguages = (value = "") => 
  value.split(",").map((item) => item.trim()).filter(Boolean);

export function formatKoreanPhoneNumber(value: string): string {
  const clean = value.replace(/\D/g, "");
  const truncated = clean.slice(0, 11);
  if (truncated.startsWith("02")) {
    if (truncated.length <= 2) return truncated;
    if (truncated.length <= 5) return `${truncated.slice(0, 2)}-${truncated.slice(2)}`;
    if (truncated.length <= 9) return `${truncated.slice(0, 2)}-${truncated.slice(2, 5)}-${truncated.slice(5)}`;
    return `${truncated.slice(0, 2)}-${truncated.slice(2, 6)}-${truncated.slice(6)}`;
  }
  if (truncated.length <= 3) return truncated;
  if (truncated.length <= 7) return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
  if (truncated.length <= 10) return `${truncated.slice(0, 3)}-${truncated.slice(3, 6)}-${truncated.slice(6)}`;
  return `${truncated.slice(0, 3)}-${truncated.slice(3, 7)}-${truncated.slice(7)}`;
}

