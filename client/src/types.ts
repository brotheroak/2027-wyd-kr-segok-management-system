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
export type ApplyView = "intro" | "apply" | "homestay" | "volunteer" | "check" | "privacy" | "terms";

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
