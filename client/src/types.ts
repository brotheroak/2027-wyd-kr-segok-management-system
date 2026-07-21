export type FamilyMember = {
  id?: string;
  relationship: string;
  name: string;
  baptismalName?: string;
  birthDate: string;
  gender: string;
};

export type DistrictInfo = {
  no: string;
  name: string;
  ban: string;
  label: string;
  confidence?: string;
  reason?: string;
};

export type ApplicationPayload = {
  id?: string;
  applicationNo?: string;
  status?: string;
  representative: {
    name: string;
    baptismalName?: string;
    gender: string;
    birthDate: string;
    phone: string;
    email?: string;
    applicantPin?: string;
    postcode?: string;
    address: string;
    addressDetail?: string;
  };
  members: FamilyMember[];
  homestay: {
    householdTotal: number;
    housingType: string;
    housingTypeOther?: string;
    hasPet: boolean;
    petDescription?: string;
    languages: string[];
    preferredGender: string;
    capacity: number;
    hasBed: boolean;
    spaceDescription: string;
  };
  confirmations: {
    period: boolean;
    breakfast: boolean;
    faithCommunity: boolean;
    appliedDate: string;
    signatureName: string;
  };
  district?: DistrictInfo;
  updatedAt?: string;
};

export type AdminRole = "admin" | "privacy_admin" | "super_admin";
export type ApplyView = "intro" | "apply" | "homestay" | "volunteer" | "check" | "schedule" | "community" | "host" | "pilgrim" | "privacy" | "terms";

export type VolunteerPayload = {
  id?: string;
  volunteerNo?: string;
  status?: string;
  name: string;
  baptismalName?: string;
  gender: string;
  birthDate: string;
  phone: string;
  email?: string;
  parishGroup?: string;
  affiliation?: string;
  postcode?: string;
  address: string;
  addressDetail?: string;
  supportFields: string[];
  supportLanguage?: string;
  availability: string;
  experience: string;
  privacyConsent: boolean;
  appliedDate: string;
  signatureName: string;
  district?: DistrictInfo;
  updatedAt?: string;
};

export type VolunteerShift = {
  id: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status: "open" | "closed";
  signupCount: number;
  registered?: boolean;
  signups?: Array<{ id: string; volunteerId: string; volunteerNo: string; name: string; phone: string; status: string }>;
};

export type Pilgrim = {
  id: string;
  pilgrimNo: string;
  name: string;
  baptismalName: string;
  email: string;
  preferredLanguage: "ko" | "en" | "es" | "it" | "fr" | "pt";
  gender: string;
  diocese: string;
  region: string;
  grade: string;
  age: number;
  dietType: string;
  dietNotes: string;
  allergies: string;
  healthNotes: string;
  feverStatus: string;
  hostApplicationId?: string;
  cardUrl?: string;
  cardExpiresAt?: string;
  host?: { applicationNo: string; name: string; address: string } | null;
  mealLogs?: Array<{ id: string; mealType: string; note: string; recordedAt: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export type FaqItem = { id: string; category: string; question: string; answer: string; sortOrder: number; published: boolean };
export type QnaPost = { id: string; authorName: string; category: string; title: string; content: string; answer: string; status: string; createdAt: string; answeredAt?: string };
