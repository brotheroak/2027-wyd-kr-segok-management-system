import { pgTable, text as pgText, integer as pgInteger, boolean as pgBoolean } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";

// ==========================================
// SQLite Schema Definition (for Local Dev)
// ==========================================

export const sqliteApplications = sqliteTable("homestay_applications", {
  id: sqliteText("id").primaryKey(),
  applicationNo: sqliteText("application_no").unique().notNull(),
  status: sqliteText("status").notNull().default("submitted"),
  repName: sqliteText("rep_name").notNull(),
  baptismalName: sqliteText("baptismal_name"),
  gender: sqliteText("gender").notNull(),
  birthDate: sqliteText("birth_date").notNull(),
  phone: sqliteText("phone").notNull(),
  email: sqliteText("email").notNull(),
  applicantPin: sqliteText("applicant_pin").notNull().default(""),
  postcode: sqliteText("postcode"),
  address: sqliteText("address").notNull(),
  addressDetail: sqliteText("address_detail"),
  householdTotal: sqliteInteger("household_total").notNull(),
  housingType: sqliteText("housing_type").notNull(),
  housingTypeOther: sqliteText("housing_type_other"),
  hasPet: sqliteInteger("has_pet").notNull(), // 0 or 1
  petDescription: sqliteText("pet_description"),
  languages: sqliteText("languages").notNull(),
  preferredGender: sqliteText("preferred_gender").notNull(),
  capacity: sqliteInteger("capacity").notNull(),
  hasBed: sqliteInteger("has_bed").notNull(), // 0 or 1
  spaceDescription: sqliteText("space_description").notNull(),
  consentChecks: sqliteText("consent_checks").notNull(),
  signatureName: sqliteText("signature_name").notNull(),
  appliedDate: sqliteText("applied_date").notNull(),
  createdAt: sqliteText("created_at").notNull(),
  updatedAt: sqliteText("updated_at").notNull(),
  canceledAt: sqliteText("canceled_at"),
});

export const sqliteFamilyMembers = sqliteTable("family_members", {
  id: sqliteText("id").primaryKey(),
  applicationId: sqliteText("application_id").notNull(),
  relationship: sqliteText("relationship").notNull(),
  name: sqliteText("name").notNull(),
  baptismalName: sqliteText("baptismal_name"),
  birthDate: sqliteText("birth_date").notNull(),
  gender: sqliteText("gender").notNull(),
});

export const sqliteHostCapabilities = sqliteTable("host_capabilities", {
  id: sqliteText("id").primaryKey(),
  applicationId: sqliteText("application_id").notNull(),
  capabilityKey: sqliteText("capability_key").notNull(),
  capabilityValue: sqliteText("capability_value").notNull(),
});

export const sqliteVolunteers = sqliteTable("volunteers", {
  id: sqliteText("id").primaryKey(),
  volunteerNo: sqliteText("volunteer_no").unique().notNull(),
  status: sqliteText("status").notNull().default("submitted"),
  name: sqliteText("name").notNull(),
  baptismalName: sqliteText("baptismal_name"),
  gender: sqliteText("gender").notNull(),
  birthDate: sqliteText("birth_date").notNull(),
  phone: sqliteText("phone").notNull(),
  email: sqliteText("email").notNull(),
  postcode: sqliteText("postcode"),
  address: sqliteText("address").notNull(),
  addressDetail: sqliteText("address_detail"),
  supportFields: sqliteText("support_fields").notNull(),
  supportLanguage: sqliteText("support_language"),
  availability: sqliteText("availability").notNull(),
  experience: sqliteText("experience").notNull(),
  privacyConsent: sqliteInteger("privacy_consent").notNull(), // 0 or 1
  appliedDate: sqliteText("applied_date").notNull(),
  signatureName: sqliteText("signature_name").notNull(),
  createdAt: sqliteText("created_at").notNull(),
  updatedAt: sqliteText("updated_at").notNull(),
  canceledAt: sqliteText("canceled_at"),
  applicantPin: sqliteText("applicant_pin").notNull().default(""),
});

export const sqliteVerificationCodes = sqliteTable("verification_codes", {
  email: sqliteText("email").primaryKey(),
  emailHash: sqliteText("email_hash"),
  code: sqliteText("code").notNull(),
  expiresAt: sqliteText("expires_at").notNull(),
  attempts: sqliteInteger("attempts").notNull().default(0),
  createdAt: sqliteText("created_at").notNull(),
});

export const sqliteSessions = sqliteTable("sessions", {
  token: sqliteText("token").primaryKey(),
  email: sqliteText("email").notNull(),
  role: sqliteText("role").notNull(),
  expiresAt: sqliteText("expires_at").notNull(),
  createdAt: sqliteText("created_at").notNull(),
});

export const sqliteAuditLogs = sqliteTable("audit_logs", {
  id: sqliteText("id").primaryKey(),
  actor: sqliteText("actor").notNull(),
  action: sqliteText("action").notNull(),
  applicationId: sqliteText("application_id"),
  detail: sqliteText("detail"),
  createdAt: sqliteText("created_at").notNull(),
});

export const sqliteAdmins = sqliteTable("admins", {
  id: sqliteText("id").primaryKey(),
  email: sqliteText("email").unique().notNull(),
  passwordHash: sqliteText("password_hash").notNull(),
  role: sqliteText("role").notNull(), // 'admin' or 'privacy_admin'
  mfaSecret: sqliteText("mfa_secret").notNull(),
  mfaEnabled: sqliteInteger("mfa_enabled").notNull().default(0), // 0 or 1
  createdAt: sqliteText("created_at").notNull(),
  updatedAt: sqliteText("updated_at").notNull(),
});

// ==========================================
// PostgreSQL Schema Definition (for Production)
// ==========================================

export const pgApplications = pgTable("homestay_applications", {
  id: pgText("id").primaryKey(),
  applicationNo: pgText("application_no").unique().notNull(),
  status: pgText("status").notNull().default("submitted"),
  repName: pgText("rep_name").notNull(),
  baptismalName: pgText("baptismal_name"),
  gender: pgText("gender").notNull(),
  birthDate: pgText("birth_date").notNull(),
  phone: pgText("phone").notNull(),
  email: pgText("email").notNull(),
  applicantPin: pgText("applicant_pin").notNull().default(""),
  postcode: pgText("postcode"),
  address: pgText("address").notNull(),
  addressDetail: pgText("address_detail"),
  householdTotal: pgInteger("household_total").notNull(),
  housingType: pgText("housing_type").notNull(),
  housingTypeOther: pgText("housing_type_other"),
  hasPet: pgBoolean("has_pet").notNull(), // PostgreSQL handles real boolean
  petDescription: pgText("pet_description"),
  languages: pgText("languages").notNull(),
  preferredGender: pgText("preferred_gender").notNull(),
  capacity: pgInteger("capacity").notNull(),
  hasBed: pgBoolean("has_bed").notNull(), // PostgreSQL handles real boolean
  spaceDescription: pgText("space_description").notNull(),
  consentChecks: pgText("consent_checks").notNull(),
  signatureName: pgText("signature_name").notNull(),
  appliedDate: pgText("applied_date").notNull(),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
  canceledAt: pgText("canceled_at"),
});

export const pgFamilyMembers = pgTable("family_members", {
  id: pgText("id").primaryKey(),
  applicationId: pgText("application_id").notNull(),
  relationship: pgText("relationship").notNull(),
  name: pgText("name").notNull(),
  baptismalName: pgText("baptismal_name"),
  birthDate: pgText("birth_date").notNull(),
  gender: pgText("gender").notNull(),
});

export const pgHostCapabilities = pgTable("host_capabilities", {
  id: pgText("id").primaryKey(),
  applicationId: pgText("application_id").notNull(),
  capabilityKey: pgText("capability_key").notNull(),
  capabilityValue: pgText("capability_value").notNull(),
});

export const pgVolunteers = pgTable("volunteers", {
  id: pgText("id").primaryKey(),
  volunteerNo: pgText("volunteer_no").unique().notNull(),
  status: pgText("status").notNull().default("submitted"),
  name: pgText("name").notNull(),
  baptismalName: pgText("baptismal_name"),
  gender: pgText("gender").notNull(),
  birthDate: pgText("birth_date").notNull(),
  phone: pgText("phone").notNull(),
  email: pgText("email").notNull(),
  postcode: pgText("postcode"),
  address: pgText("address").notNull(),
  addressDetail: pgText("address_detail"),
  supportFields: pgText("support_fields").notNull(),
  supportLanguage: pgText("support_language"),
  availability: pgText("availability").notNull(),
  experience: pgText("experience").notNull(),
  privacyConsent: pgBoolean("privacy_consent").notNull(), // PostgreSQL handles real boolean
  appliedDate: pgText("applied_date").notNull(),
  signatureName: pgText("signature_name").notNull(),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
  canceledAt: pgText("canceled_at"),
  applicantPin: pgText("applicant_pin").notNull().default(""),
});

export const pgVerificationCodes = pgTable("verification_codes", {
  email: pgText("email").primaryKey(),
  emailHash: pgText("email_hash"),
  code: pgText("code").notNull(),
  expiresAt: pgText("expires_at").notNull(),
  attempts: pgInteger("attempts").notNull().default(0),
  createdAt: pgText("created_at").notNull(),
});

export const pgSessions = pgTable("sessions", {
  token: pgText("token").primaryKey(),
  email: pgText("email").notNull(),
  role: pgText("role").notNull(),
  expiresAt: pgText("expires_at").notNull(),
  createdAt: pgText("created_at").notNull(),
});

export const pgAuditLogs = pgTable("audit_logs", {
  id: pgText("id").primaryKey(),
  actor: pgText("actor").notNull(),
  action: pgText("action").notNull(),
  applicationId: pgText("application_id"),
  detail: pgText("detail"),
  createdAt: pgText("created_at").notNull(),
});

export const pgAdmins = pgTable("admins", {
  id: pgText("id").primaryKey(),
  email: pgText("email").unique().notNull(),
  passwordHash: pgText("password_hash").notNull(),
  role: pgText("role").notNull(), // 'admin' or 'privacy_admin'
  mfaSecret: pgText("mfa_secret").notNull(),
  mfaEnabled: pgBoolean("mfa_enabled").notNull().default(false),
  createdAt: pgText("created_at").notNull(),
  updatedAt: pgText("updated_at").notNull(),
});
