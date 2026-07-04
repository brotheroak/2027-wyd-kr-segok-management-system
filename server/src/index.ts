import cors from "cors";
import express from "express";
import fs from "node:fs";
import { createHash, randomInt, pbkdf2Sync, randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { db, tables, initDb, isPg, checkDbReady } from "./db.js";
import { decryptText, encryptText, encryptionEnabled, requireEncryptionKeyInProduction } from "./crypto.js";
import { notificationStatus, sendVerificationMessage } from "./notifications.js";
import { applicationSchema, volunteerSchema } from "./validators.js";
import type { ApplicationPayload, FamilyMember, VolunteerPayload } from "./types.js";
import { verifyTotp } from "./totp.js";
import { sql, eq, and, or, like, desc } from "drizzle-orm";

const app = express();
const port = Number(process.env.PORT ?? 4177);

const isProd = process.env.NODE_ENV === "production";
const maxConcurrentRequests = Number(process.env.MAX_CONCURRENT_REQUESTS ?? 500);
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 240);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// We no longer require ADMIN_PIN or PRIVACY_ADMIN_PIN in production,
// as individual credentials and OTP (MFA) are used instead!
// But for fallback or checking, we can keep the setup secure.
requireEncryptionKeyInProduction();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY ?? 1);

function securityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "script-src 'self' https://t1.kakaocdn.net https://t1.daumcdn.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-src 'self' https://postcode.map.kakao.com https://postcode.map.daum.net"
  ].join("; "));
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}

function isFunnelExempt(pathname: string) {
  return pathname === "/api/health"
    || pathname === "/api/ready"
    || pathname === "/api/funnel/status"
    || pathname.startsWith("/assets/")
    || pathname.startsWith("/images/")
    || /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(pathname);
}

function funnelHtml() {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>잠시만 기다려 주세요</title><style>body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#121e31;color:#fff;display:grid;min-height:100vh;place-items:center}main{max-width:520px;padding:32px;text-align:center}h1{font-size:28px;margin:0 0 12px}p{color:rgba(255,255,255,.78);line-height:1.7}.mark{width:64px;height:64px;border:2px solid #d7bc76;border-radius:50%;display:grid;place-items:center;margin:0 auto 22px;color:#d7bc76}</style><script>setTimeout(function(){location.reload()},10000)</script></head><body><main><div class="mark">WYD</div><h1>현재 접속자가 많습니다</h1><p>안정적인 신청 접수를 위해 잠시 대기 중입니다. 약 10초 뒤 자동으로 다시 시도합니다.</p></main></body></html>`;
}

let activeRequests = 0;
let refusedRequests = 0;

function trafficFunnel(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (maxConcurrentRequests <= 0 || isFunnelExempt(req.path)) return next();
  if (activeRequests >= maxConcurrentRequests) {
    refusedRequests += 1;
    res.setHeader("Retry-After", "10");
    if (req.path.startsWith("/api/")) {
      return res.status(503).json({
        message: "현재 접속자가 많아 잠시 후 다시 시도해 주세요.",
        maxConcurrentRequests,
        activeRequests
      });
    }
    return res.status(503).type("html").send(funnelHtml());
  }

  activeRequests += 1;
  let released = false;
  const releaseSlot = () => {
    if (released) return;
    released = true;
    activeRequests = Math.max(0, activeRequests - 1);
  };
  res.on("finish", releaseSlot);
  res.on("close", releaseSlot);
  next();
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const pathname = req.originalUrl.split("?")[0];
  if (rateLimitMax <= 0 || pathname === "/api/health" || pathname === "/api/ready" || pathname === "/api/funnel/status") {
    return next();
  }
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > rateLimitMax) {
    const retrySeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retrySeconds));
    return res.status(429).json({ message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}, Math.max(rateLimitWindowMs, 60_000)).unref();

app.use(securityHeaders);
app.use(trafficFunnel);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!isProd && /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit);

type Role = "user" | "admin" | "privacy_admin";
type Session = { email: string; role: Role };

const nowIso = () => new Date().toISOString();
const addMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const stableHash = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
const hashApplicantPin = (applicationId: string, pin: string) => createHash("sha256").update(`${applicationId}:${pin}`).digest("hex");
const verifyApplicantPin = (applicationId: string, pin: string, stored: string) => {
  if (!stored) return false;
  if (stored === pin) return true;
  return stored === hashApplicantPin(applicationId, pin);
};
const seoulDateKey = () => {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}${value("month")}${value("day")}`;
};

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

async function logAudit(actor: string, action: string, applicationId?: string, detail?: unknown) {
  try {
    await db.insert(tables.auditLogs).values({
      id: nanoid(),
      actor: pii(actor),
      action,
      applicationId: applicationId ?? null,
      detail: detail ? JSON.stringify(detail) : null,
      createdAt: nowIso()
    });
  } catch (error) {
    console.error("Audit log insert failed:", error);
  }
}

async function sessionFrom(req: express.Request, roles?: Role | Role[]): Promise<Session | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  
  const rows = await db.select({
    email: tables.sessions.email,
    role: tables.sessions.role,
    expiresAt: tables.sessions.expiresAt
  })
  .from(tables.sessions)
  .where(eq(tables.sessions.token, token));
  
  const row = rows[0];
  if (!row || row.expiresAt < nowIso()) return null;
  const allowed = Array.isArray(roles) ? roles : roles ? [roles] : null;
  if (allowed && !allowed.includes(row.role)) return null;
  return { email: plain(row.email), role: row.role };
}

function requireSession(roles?: Role | Role[]) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = await sessionFrom(req, roles);
    if (!session) return res.status(401).json({ message: "인증이 필요합니다." });
    res.locals.session = session;
    next();
  };
}

const requireAdmin = requireSession(["admin", "privacy_admin"]);
const requirePrivacyAdmin = requireSession("privacy_admin");

function actorFrom(session: Session) {
  return session.role === "privacy_admin" ? "privacy_admin" : session.email;
}

function pii(value = "") {
  return encryptText(value);
}

function plain(value = "") {
  return decryptText(value);
}

function maskName(value = "") {
  const text = value.trim();
  if (!text) return "";
  if (text.length <= 2) return `${text[0]}*`;
  return `${text[0]}${"*".repeat(Math.min(text.length - 1, 3))}`;
}

function maskEmail(value = "") {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "비공개";
  return `${local[0]}***@${domain}`;
}

function maskPhone(value = "") {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return "비공개";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function maskBirthDate(value = "") {
  return value ? `${value.slice(0, 4)}-**-**` : "";
}

function maskAddress(address = "") {
  const parts = address.split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]} ***` : "비공개";
}

function anonymizeApplication(application: Awaited<ReturnType<typeof rowToApplication>> | null) {
  if (!application) return application;
  return {
    ...application,
    representative: {
      ...application.representative,
      name: maskName(application.representative.name),
      baptismalName: application.representative.baptismalName ? "비공개" : "",
      birthDate: maskBirthDate(application.representative.birthDate),
      phone: maskPhone(application.representative.phone),
      email: maskEmail(application.representative.email),
      postcode: "",
      address: maskAddress(application.representative.address),
      addressDetail: ""
    },
    members: application.members.map((member: any) => ({
      ...member,
      name: maskName(member.name),
      baptismalName: member.baptismalName ? "비공개" : "",
      birthDate: maskBirthDate(member.birthDate)
    })),
    confirmations: {
      ...application.confirmations,
      signatureName: maskName(application.confirmations.signatureName)
    }
  };
}

function visibleApplicationFor(session: Session, application: any) {
  return session.role === "privacy_admin" ? application : anonymizeApplication(application);
}

async function makeApplicationNo() {
  const ymd = seoulDateKey();
  const countRows = await db.select({
    id: tables.applications.id
  }).from(tables.applications).where(like(tables.applications.applicationNo, `WYD-${ymd}-%`));
  return `WYD-${ymd}-${String(countRows.length + 1).padStart(4, "0")}`;
}

async function makeVolunteerNo() {
  const ymd = seoulDateKey();
  const countRows = await db.select({
    id: tables.volunteers.id
  }).from(tables.volunteers).where(like(tables.volunteers.volunteerNo, `VOL-${ymd}-%`));
  return `VOL-${ymd}-${String(countRows.length + 1).padStart(4, "0")}`;
}

async function insertCapabilities(tx: any, applicationId: string, payload: ApplicationPayload) {
  await tx.delete(tables.hostCapabilities).where(eq(tables.hostCapabilities.applicationId, applicationId));
  const values: Array<{ id: string; applicationId: string; capabilityKey: string; capabilityValue: string }> = [
    { id: nanoid(), applicationId, capabilityKey: "capacity", capabilityValue: String(payload.homestay.capacity) },
    { id: nanoid(), applicationId, capabilityKey: "has_bed", capabilityValue: payload.homestay.hasBed ? "yes" : "no" },
    { id: nanoid(), applicationId, capabilityKey: "has_pet", capabilityValue: payload.homestay.hasPet ? "yes" : "no" },
    { id: nanoid(), applicationId, capabilityKey: "preferred_gender", capabilityValue: payload.homestay.preferredGender },
    { id: nanoid(), applicationId, capabilityKey: "housing_type", capabilityValue: payload.homestay.housingType },
    ...payload.homestay.languages.map((language): { id: string; applicationId: string; capabilityKey: string; capabilityValue: string } => ({
      id: nanoid(),
      applicationId,
      capabilityKey: "language",
      capabilityValue: language
    }))
  ];
  for (const val of values) {
    await tx.insert(tables.hostCapabilities).values(val);
  }
}

async function upsertApplication(payload: ApplicationPayload, existingId?: string) {
  const parsed = applicationSchema.parse(payload);
  const id = existingId ?? nanoid();
  const timestamp = nowIso();
  const applicantPin = parsed.representative.applicantPin ?? "";
  const applicantPinHash = applicantPin ? hashApplicantPin(id, applicantPin) : "";
  if (!existingId && !/^\d{4}$/.test(applicantPin)) {
    throw new Error("신청 확인용 숫자 비밀번호 4자리를 입력해 주세요.");
  }
  const applicationNo = existingId
    ? (await db.select({ applicationNo: tables.applications.applicationNo }).from(tables.applications).where(eq(tables.applications.id, existingId)))[0].applicationNo
    : await makeApplicationNo();

  await db.transaction(async (tx: any) => {
    const data: any = {
      repName: pii(parsed.representative.name),
      baptismalName: pii(parsed.representative.baptismalName ?? ""),
      gender: parsed.representative.gender,
      birthDate: parsed.representative.birthDate,
      phone: pii(parsed.representative.phone),
      email: pii(parsed.representative.email ?? ""),
      postcode: parsed.representative.postcode ?? "",
      address: pii(parsed.representative.address),
      addressDetail: pii(parsed.representative.addressDetail ?? ""),
      householdTotal: parsed.homestay.householdTotal,
      housingType: parsed.homestay.housingType,
      housingTypeOther: parsed.homestay.housingTypeOther ?? "",
      hasPet: isPg ? (parsed.homestay.hasPet) : (parsed.homestay.hasPet ? 1 : 0),
      petDescription: parsed.homestay.petDescription ?? "",
      languages: JSON.stringify(parsed.homestay.languages),
      preferredGender: parsed.homestay.preferredGender,
      capacity: parsed.homestay.capacity,
      hasBed: isPg ? (parsed.homestay.hasBed) : (parsed.homestay.hasBed ? 1 : 0),
      spaceDescription: parsed.homestay.spaceDescription,
      consentChecks: JSON.stringify({
        period: parsed.confirmations.period,
        breakfast: parsed.confirmations.breakfast,
        faithCommunity: parsed.confirmations.faithCommunity
      }),
      signatureName: pii(parsed.confirmations.signatureName),
      appliedDate: parsed.confirmations.appliedDate,
      updatedAt: timestamp
    };

    if (applicantPinHash) {
      data.applicantPin = applicantPinHash;
    }

    if (existingId) {
      data.status = sql`CASE WHEN ${tables.applications.status} = 'canceled' THEN 'submitted' ELSE ${tables.applications.status} END`;
      data.canceledAt = null;
      await tx.update(tables.applications).set(data).where(eq(tables.applications.id, existingId));
      await tx.delete(tables.familyMembers).where(eq(tables.familyMembers.applicationId, existingId));
    } else {
      data.id = id;
      data.applicationNo = applicationNo;
      data.status = "submitted";
      data.createdAt = timestamp;
      await tx.insert(tables.applications).values(data);
    }

    for (const member of parsed.members) {
      await tx.insert(tables.familyMembers).values({
        id: nanoid(),
        applicationId: id,
        relationship: member.relationship,
        name: pii(member.name),
        baptismalName: pii(member.baptismalName ?? ""),
        birthDate: member.birthDate,
        gender: member.gender
      });
    }
    await insertCapabilities(tx, id, parsed);
  });
  
  return getApplication(id);
}

async function rowToApplication(row: any) {
  const members = (await db.select({
    id: tables.familyMembers.id,
    relationship: tables.familyMembers.relationship,
    name: tables.familyMembers.name,
    baptismalName: tables.familyMembers.baptismalName,
    birthDate: tables.familyMembers.birthDate,
    gender: tables.familyMembers.gender
  })
  .from(tables.familyMembers)
  .where(eq(tables.familyMembers.applicationId, row.id)))
  .map((member: any) => ({
    id: member.id,
    relationship: member.relationship,
    name: plain(member.name),
    baptismalName: plain(member.baptismalName),
    birthDate: member.birthDate,
    gender: member.gender
  }));

  // Handle boolean field compatibility from DB (SQLite returns 0/1, PG returns true/false)
  const castBool = (val: any) => val === true || val === 1 || val === "1";

  return {
    id: row.id,
    applicationNo: row.applicationNo,
    status: row.status,
    representative: {
      name: plain(row.repName),
      baptismalName: plain(row.baptismalName),
      gender: row.gender,
      birthDate: row.birthDate,
      phone: plain(row.phone),
      email: plain(row.email),
      postcode: row.postcode,
      address: plain(row.address),
      addressDetail: plain(row.addressDetail)
    },
    members,
    homestay: {
      householdTotal: row.householdTotal,
      housingType: row.housingType,
      housingTypeOther: row.housingTypeOther,
      hasPet: castBool(row.hasPet),
      petDescription: row.petDescription,
      languages: JSON.parse(row.languages),
      preferredGender: row.preferredGender,
      capacity: row.capacity,
      hasBed: castBool(row.hasBed),
      spaceDescription: row.spaceDescription
    },
    confirmations: {
      ...JSON.parse(row.consentChecks),
      appliedDate: row.appliedDate,
      signatureName: plain(row.signatureName)
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canceledAt: row.canceledAt
  };
}

async function getApplication(id: string) {
  const rows = await db.select().from(tables.applications).where(eq(tables.applications.id, id));
  return rows[0] ? rowToApplication(rows[0]) : null;
}

async function latestApplicationByEmail(email: string) {
  const rows = await db.select().from(tables.applications).orderBy(desc(tables.applications.createdAt));
  const row = rows.find((candidate: any) => plain(candidate.email).toLowerCase() === email.toLowerCase());
  return row ? rowToApplication(row) : null;
}

async function createApplicantSession(applicationId: string) {
  const token = nanoid(48);
  await db.insert(tables.sessions).values({
    token,
    email: pii(`app:${applicationId}`),
    role: "user",
    expiresAt: addDays(14),
    createdAt: nowIso()
  });
  return token;
}

async function applicationForUserSession(session: Session) {
  if (session.email.startsWith("app:")) {
    return getApplication(session.email.slice(4));
  }
  return latestApplicationByEmail(session.email);
}

async function findApplicationByLookup(name: string, phone: string, pin: string) {
  const phoneDigits = normalizePhone(phone);
  const rows = await db.select().from(tables.applications).orderBy(desc(tables.applications.createdAt));
  const row = rows.find((candidate: any) => {
    return plain(candidate.repName).trim() === name
      && normalizePhone(plain(candidate.phone)) === phoneDigits
      && verifyApplicantPin(candidate.id, pin, candidate.applicantPin);
  });
  return row ? rowToApplication(row) : null;
}

function rowToVolunteer(row: any) {
  const castBool = (val: any) => val === true || val === 1 || val === "1";
  return {
    id: row.id,
    volunteerNo: row.volunteerNo,
    status: row.status,
    name: plain(row.name),
    baptismalName: plain(row.baptismalName),
    gender: row.gender,
    birthDate: row.birthDate,
    phone: plain(row.phone),
    email: plain(row.email),
    postcode: row.postcode,
    address: plain(row.address),
    addressDetail: plain(row.addressDetail),
    supportFields: JSON.parse(row.supportFields),
    supportLanguage: row.supportLanguage,
    availability: row.availability,
    experience: row.experience,
    privacyConsent: castBool(row.privacyConsent),
    appliedDate: row.appliedDate,
    signatureName: plain(row.signatureName),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canceledAt: row.canceledAt
  };
}

async function getVolunteer(id: string) {
  const rows = await db.select().from(tables.volunteers).where(eq(tables.volunteers.id, id));
  return rows[0] ? rowToVolunteer(rows[0]) : null;
}

async function upsertVolunteer(payload: VolunteerPayload, existingId?: string) {
  const parsed = volunteerSchema.parse(payload);
  const id = existingId ?? nanoid();
  const timestamp = nowIso();
  const volunteerNo = existingId
    ? (await db.select({ volunteerNo: tables.volunteers.volunteerNo }).from(tables.volunteers).where(eq(tables.volunteers.id, existingId)))[0].volunteerNo
    : await makeVolunteerNo();

  const data: any = {
    name: pii(parsed.name),
    baptismalName: pii(parsed.baptismalName ?? ""),
    gender: parsed.gender,
    birthDate: parsed.birthDate,
    phone: pii(parsed.phone),
    email: pii(parsed.email ?? ""),
    postcode: parsed.postcode ?? "",
    address: pii(parsed.address),
    addressDetail: pii(parsed.addressDetail ?? ""),
    supportFields: JSON.stringify(parsed.supportFields),
    supportLanguage: parsed.supportLanguage ?? "",
    availability: parsed.availability,
    experience: parsed.experience,
    privacyConsent: isPg ? parsed.privacyConsent : (parsed.privacyConsent ? 1 : 0),
    appliedDate: parsed.appliedDate,
    signatureName: pii(parsed.signatureName),
    updatedAt: timestamp
  };

  if (existingId) {
    data.status = sql`CASE WHEN ${tables.volunteers.status} = 'canceled' THEN 'submitted' ELSE ${tables.volunteers.status} END`;
    data.canceledAt = null;
    await db.update(tables.volunteers).set(data).where(eq(tables.volunteers.id, existingId));
  } else {
    data.id = id;
    data.volunteerNo = volunteerNo;
    data.status = "submitted";
    data.createdAt = timestamp;
    await db.insert(tables.volunteers).values(data);
  }
  return getVolunteer(id);
}

function anonymizeVolunteer(volunteer: ReturnType<typeof rowToVolunteer> | null) {
  if (!volunteer) return volunteer;
  return {
    ...volunteer,
    name: maskName(volunteer.name),
    baptismalName: volunteer.baptismalName ? "비공개" : "",
    birthDate: maskBirthDate(volunteer.birthDate),
    phone: maskPhone(volunteer.phone),
    email: maskEmail(volunteer.email),
    postcode: "",
    address: maskAddress(volunteer.address),
    addressDetail: "",
    signatureName: maskName(volunteer.signatureName)
  };
}

function visibleVolunteerFor(session: Session, volunteer: any) {
  return session.role === "privacy_admin" ? volunteer : anonymizeVolunteer(volunteer);
}

async function encryptExistingPersonalData() {
  if (!encryptionEnabled()) return;

  await db.transaction(async (tx: any) => {
    const apps = await tx.select().from(tables.applications);
    for (const row of apps) {
      if (!row.repName.startsWith("enc:v1:")) {
        await tx.update(tables.applications).set({
          repName: pii(plain(row.repName)),
          baptismalName: pii(plain(row.baptismalName ?? "")),
          phone: pii(plain(row.phone)),
          email: pii(plain(row.email)),
          address: pii(plain(row.address)),
          addressDetail: pii(plain(row.addressDetail ?? "")),
          signatureName: pii(plain(row.signatureName))
        }).where(eq(tables.applications.id, row.id));
      }
    }

    const members = await tx.select().from(tables.familyMembers);
    for (const row of members) {
      if (!row.name.startsWith("enc:v1:")) {
        await tx.update(tables.familyMembers).set({
          name: pii(plain(row.name)),
          baptismalName: pii(plain(row.baptismalName ?? ""))
        }).where(eq(tables.familyMembers.id, row.id));
      }
    }

    const volunteers = await tx.select().from(tables.volunteers);
    for (const row of volunteers) {
      if (!row.name.startsWith("enc:v1:")) {
        await tx.update(tables.volunteers).set({
          name: pii(plain(row.name)),
          baptismalName: pii(plain(row.baptismalName ?? "")),
          phone: pii(plain(row.phone)),
          email: pii(plain(row.email)),
          address: pii(plain(row.address)),
          addressDetail: pii(plain(row.addressDetail ?? "")),
          signatureName: pii(plain(row.signatureName))
        }).where(eq(tables.volunteers.id, row.id));
      }
    }

    const sessions = await tx.select().from(tables.sessions);
    for (const row of sessions) {
      if (!row.email.startsWith("enc:v1:")) {
        await tx.update(tables.sessions).set({
          email: pii(plain(row.email))
        }).where(eq(tables.sessions.token, row.token));
      }
    }

    const vcodes = await tx.select().from(tables.verificationCodes);
    for (const row of vcodes) {
      const emailVal = plain(row.email);
      if (!emailVal.startsWith("enc:v1:")) {
        const emailHash = /^[a-f0-9]{64}$/i.test(emailVal) ? emailVal : stableHash(emailVal);
        await tx.update(tables.verificationCodes).set({
          email: emailHash,
          emailHash: row.emailHash || emailHash
        }).where(eq(tables.verificationCodes.email, row.email));
      }
    }

    const logs = await tx.select().from(tables.auditLogs);
    for (const row of logs) {
      if (!row.actor.startsWith("enc:v1:")) {
        await tx.update(tables.auditLogs).set({
          actor: pii(plain(row.actor))
        }).where(eq(tables.auditLogs.id, row.id));
      }
    }
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "WYD Seoul 2027 Homestay", time: nowIso() });
});

app.get("/api/ready", async (_req, res) => {
  try {
    await checkDbReady();
    res.json({ ok: true, db: "ready", encryption: encryptionEnabled(), notifications: notificationStatus(), time: nowIso() });
  } catch (error) {
    res.status(503).json({ ok: false, db: "unavailable", message: (error as Error).message });
  }
});

app.get("/api/funnel/status", (_req, res) => {
  res.json({
    maxConcurrentRequests,
    activeRequests,
    availableSlots: Math.max(0, maxConcurrentRequests - activeRequests),
    refusedRequests
  });
});

app.get("/api/test/sleep", (req, res) => {
  if (process.env.ENABLE_STRESS_ENDPOINT !== "true") {
    return res.status(404).json({ message: "Not found" });
  }
  const ms = Math.min(Math.max(Number(req.query.ms ?? 1000), 0), 10_000);
  setTimeout(() => {
    res.json({ ok: true, sleptMs: ms });
  }, ms);
});

app.post("/api/auth/request-code", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const phone = String(req.body.phone ?? "").trim();
  if (!email.includes("@")) return res.status(400).json({ message: "올바른 이메일을 입력해 주세요." });
  const code = String(randomInt(100000, 1000000));
  const emailHash = stableHash(email);
  
  // Clean expired codes first
  await db.delete(tables.verificationCodes).where(eq(tables.verificationCodes.email, emailHash));
  await db.insert(tables.verificationCodes).values({
    email: emailHash,
    emailHash,
    code,
    expiresAt: addMinutes(10),
    attempts: 0,
    createdAt: nowIso()
  });

  const delivery = await sendVerificationMessage({ email, phone, code });
  if (isProd && delivery.deliveries.length === 0) {
    return res.status(502).json({ message: "인증번호 발송 서비스가 설정되지 않았거나 발송에 실패했습니다." });
  }
  if (!isProd) console.log(`[WYD homestay] verification code for ${email}: ${code}`);
  res.json({
    message: delivery.deliveries.length
      ? `인증번호를 발송했습니다. (${delivery.deliveries.join(", ")})`
      : "인증번호를 생성했습니다. 개발 환경에서는 화면에 표시됩니다.",
    deliveries: delivery.deliveries,
    deliveryErrors: isProd ? undefined : delivery.errors,
    devCode: isProd ? undefined : code
  });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const code = String(req.body.code ?? "").trim();
  const emailHash = stableHash(email);
  
  const rows = await db.select().from(tables.verificationCodes).where(eq(tables.verificationCodes.email, emailHash));
  const row = rows[0];
  if (!row || row.expiresAt < nowIso() || row.attempts >= 5 || row.code !== code) {
    if (row) {
      await db.update(tables.verificationCodes).set({
        attempts: row.attempts + 1
      }).where(eq(tables.verificationCodes.email, emailHash));
    }
    return res.status(401).json({ message: "인증번호가 올바르지 않거나 만료되었습니다." });
  }

  await db.delete(tables.verificationCodes).where(eq(tables.verificationCodes.email, emailHash));
  const token = nanoid(48);
  await db.insert(tables.sessions).values({
    token,
    email: pii(email),
    role: "user",
    expiresAt: addDays(14),
    createdAt: nowIso()
  });
  
  const latestApp = await latestApplicationByEmail(email);
  res.json({ token, email, application: latestApp });
});

app.post("/api/applications", async (req, res) => {
  try {
    const application = await upsertApplication(req.body as ApplicationPayload);
    if (!application) return res.status(500).json({ message: "신청서를 저장하지 못했습니다." });
    const token = await createApplicantSession(application.id);
    await logAudit(application.representative.phone, "applicant_created_application", application.id);
    res.json({ token, application });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

app.post("/api/applications/lookup", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const phone = String(req.body.phone ?? "").trim();
  const applicantPin = String(req.body.applicantPin ?? "").trim();
  if (!name || !phone || !/^\d{4}$/.test(applicantPin)) {
    return res.status(400).json({ message: "성명, 연락처, 숫자 비밀번호 4자리를 입력해 주세요." });
  }
  const application = await findApplicationByLookup(name, phone, applicantPin);
  if (!application) return res.status(404).json({ message: "일치하는 접수 내역을 찾을 수 없습니다." });
  const token = await createApplicantSession(application.id);
  await logAudit(phone, "applicant_lookup_application", application.id);
  res.json({ token, application });
});

app.post("/api/volunteers", async (req, res) => {
  try {
    const volunteer = await upsertVolunteer(req.body as VolunteerPayload);
    if (!volunteer) return res.status(500).json({ message: "자원봉사자 신청서를 저장하지 못했습니다." });
    await logAudit(volunteer.phone, "volunteer_created_application", volunteer.id, { volunteerNo: volunteer.volunteerNo });
    res.json({ volunteer });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

// 어드민 로그인 및 OTP 검증 통합 핸들러
app.post("/api/admin/login", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "").trim();
  const code = String(req.body.code ?? "").trim();

  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호를 입력해 주세요." });
  }

  const admins = await db.select().from(tables.admins).where(eq(tables.admins.email, email));
  const admin = admins[0];
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  const castMfaEnabled = admin.mfaEnabled === true || admin.mfaEnabled === 1 || admin.mfaEnabled === "1";

  // 만약 OTP 코드가 입력되지 않은 경우 -> 1차 검증 성공 후 MFA 상태 반환
  if (!code) {
    if (castMfaEnabled) {
      return res.json({ mfaRequired: true, mfaEnabled: true });
    } else {
      return res.json({ mfaRequired: true, mfaEnabled: false, mfaSecret: admin.mfaSecret });
    }
  }

  // OTP 코드 검증
  const isOtpValid = verifyTotp(admin.mfaSecret, code);
  if (!isOtpValid) {
    return res.status(401).json({ message: "OTP 인증번호가 올바르지 않습니다." });
  }

  // OTP 최초 검증 성공 시 활성화 처리
  if (!castMfaEnabled) {
    await db.update(tables.admins).set({
      mfaEnabled: isPg ? true : 1
    }).where(eq(tables.admins.id, admin.id));
  }

  const token = nanoid(48);
  await db.insert(tables.sessions).values({
    token,
    email: pii(admin.email),
    role: admin.role,
    expiresAt: addDays(1),
    createdAt: nowIso()
  });

  await logAudit(admin.role, "admin_login");
  res.json({ token, role: admin.role });
});

app.get("/api/my/application", requireSession("user"), async (req, res) => {
  const session = res.locals.session as Session;
  const appData = await applicationForUserSession(session);
  res.json({ application: appData });
});

app.post("/api/my/application", requireSession("user"), async (req, res) => {
  const session = res.locals.session as Session;
  const payload = req.body as ApplicationPayload;
  const existing = await applicationForUserSession(session);
  if (!existing) return res.status(404).json({ message: "접수 내역이 없습니다." });
  if (!payload.representative.email) payload.representative.email = existing.representative.email;
  const application = await upsertApplication(payload, existing.id);
  await logAudit(session.email, "applicant_updated_application", application?.id);
  res.json({ application });
});

app.delete("/api/my/application", requireSession("user"), async (req, res) => {
  const session = res.locals.session as Session;
  const existing = await applicationForUserSession(session);
  if (!existing) return res.status(404).json({ message: "접수 내역이 없습니다." });
  
  await db.update(tables.applications).set({
    status: "canceled",
    canceledAt: nowIso(),
    updatedAt: nowIso()
  }).where(eq(tables.applications.id, existing.id));
  
  await logAudit(session.email, "applicant_canceled_application", existing.id);
  res.json({ application: await getApplication(existing.id) });
});

app.get("/api/admin/applications", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const q = String(req.query.q ?? "").trim();
  const qLower = q.toLowerCase();
  const status = String(req.query.status ?? "all");
  
  let rows;
  if (status !== "all") {
    rows = await db.select().from(tables.applications).where(eq(tables.applications.status, status)).orderBy(desc(tables.applications.updatedAt));
  } else {
    rows = await db.select().from(tables.applications).orderBy(desc(tables.applications.updatedAt));
  }

  const applications: any[] = [];
  for (const row of rows) {
    const appData = await rowToApplication(row);
    if (!qLower) {
      applications.push(visibleApplicationFor(session, appData));
      continue;
    }
    const matches = [
      appData.applicationNo,
      appData.representative.name,
      appData.representative.phone,
      appData.representative.email
    ].some((value) => String(value ?? "").toLowerCase().includes(qLower));
    if (matches) {
      applications.push(visibleApplicationFor(session, appData));
    }
  }

  // Calculate statistics database-agnostically
  const allApps = await db.select({
    status: tables.applications.status,
    capacity: tables.applications.capacity
  }).from(tables.applications);

  let total = 0;
  let submitted = 0;
  let confirmed = 0;
  let canceled = 0;
  let capacity = 0;

  for (const item of allApps) {
    total++;
    if (item.status === "submitted") submitted++;
    if (item.status === "confirmed") confirmed++;
    if (item.status === "canceled") canceled++;
    if (item.status !== "canceled") capacity += Number(item.capacity || 0);
  }

  res.json({
    role: session.role,
    canViewPersonalData: session.role === "privacy_admin",
    stats: { total, submitted, confirmed, canceled, capacity },
    applications
  });
});

app.patch("/api/admin/applications/:id/status", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const id = String(req.params.id);
  const status = String(req.body.status ?? "");
  if (!["submitted", "confirmed", "canceled"].includes(status)) return res.status(400).json({ message: "상태 값이 올바르지 않습니다." });
  
  await db.update(tables.applications).set({
    status,
    canceledAt: status === "canceled" ? nowIso() : null,
    updatedAt: nowIso()
  }).where(eq(tables.applications.id, id));

  await logAudit(actorFrom(session), "admin_changed_status", id, { status });
  res.json({ application: visibleApplicationFor(session, await getApplication(id)) });
});

app.put("/api/admin/applications/:id", requirePrivacyAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const id = String(req.params.id);
  const application = await upsertApplication(req.body as ApplicationPayload, id);
  await logAudit(actorFrom(session), "privacy_admin_updated_application", id);
  res.json({ application });
});

app.delete("/api/admin/applications/:id", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const id = String(req.params.id);
  
  await db.update(tables.applications).set({
    status: "canceled",
    canceledAt: nowIso(),
    updatedAt: nowIso()
  }).where(eq(tables.applications.id, id));

  await logAudit(actorFrom(session), "admin_canceled_application", id);
  res.json({ application: visibleApplicationFor(session, await getApplication(id)) });
});

app.get("/api/admin/audit-logs.csv", requirePrivacyAdmin, async (_req, res) => {
  const session = res.locals.session as Session;
  const rows = await db.select().from(tables.auditLogs).orderBy(desc(tables.auditLogs.createdAt));
  await logAudit(actorFrom(session), "privacy_admin_downloaded_audit_logs", undefined, { count: rows.length });
  
  const header = ["id", "actor", "action", "application_id", "detail", "created_at"];
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map((row: any) => [
      row.id,
      plain(row.actor),
      row.action,
      row.applicationId || "",
      row.detail || "",
      row.createdAt
    ].map(csvCell).join(","))
  ].join("\n");
  
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="wyd-audit-logs-${seoulDateKey()}.csv"`);
  res.send(`\uFEFF${csv}`);
});

app.get("/api/admin/volunteers", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const q = String(req.query.q ?? "").trim();
  const qLower = q.toLowerCase();
  const status = String(req.query.status ?? "all");

  let rows;
  if (status !== "all") {
    rows = await db.select().from(tables.volunteers).where(eq(tables.volunteers.status, status)).orderBy(desc(tables.volunteers.updatedAt));
  } else {
    rows = await db.select().from(tables.volunteers).orderBy(desc(tables.volunteers.updatedAt));
  }

  const volunteers: any[] = [];
  for (const row of rows) {
    const volData = rowToVolunteer(row);
    if (!qLower) {
      volunteers.push(visibleVolunteerFor(session, volData));
      continue;
    }
    const matches = [
      volData.volunteerNo,
      volData.name,
      volData.phone,
      volData.email
    ].some((value) => String(value ?? "").toLowerCase().includes(qLower));
    if (matches) {
      volunteers.push(visibleVolunteerFor(session, volData));
    }
  }

  // Stats calculation
  const allVols = await db.select({
    status: tables.volunteers.status,
    supportFields: tables.volunteers.supportFields
  }).from(tables.volunteers);

  let total = 0;
  let submitted = 0;
  let confirmed = 0;
  let canceled = 0;
  let languageSupport = 0;
  let medicalSupport = 0;

  for (const item of allVols) {
    total++;
    if (item.status === "submitted") submitted++;
    if (item.status === "confirmed") confirmed++;
    if (item.status === "canceled") canceled++;
    if (item.supportFields.includes("통역 및 언어 지원")) languageSupport++;
    if (item.supportFields.includes("의료 봉사")) medicalSupport++;
  }

  res.json({
    role: session.role,
    canViewPersonalData: session.role === "privacy_admin",
    stats: { total, submitted, confirmed, canceled, languageSupport, medicalSupport },
    volunteers
  });
});

app.post("/api/admin/volunteers/sample-data", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const list = await db.select().from(tables.volunteers).orderBy(desc(tables.volunteers.updatedAt));
  const existing = list.map(rowToVolunteer).filter((v: any) => v.phone.startsWith("010-7000-"));
  if (existing.length > 0) {
    const vols = existing.map((v: any) => visibleVolunteerFor(session, v));
    return res.json({ inserted: 0, volunteers: vols });
  }
  const samples: Array<VolunteerPayload & { status: string }> = [
    {
      name: "김마리아",
      baptismalName: "마리아",
      gender: "여성",
      birthDate: "1988-04-12",
      phone: "010-7000-0001",
      email: "maria.sample@wyd.local",
      postcode: "06376",
      address: "서울특별시 강남구 헌릉로618길 34",
      addressDetail: "세곡동",
      supportFields: ["행사 진행 및 안내", "통역 및 언어 지원"],
      supportLanguage: "English, Español",
      availability: "주간",
      experience: "본당 청년회 안내 봉사 3년, 외국인 순례자 안내 경험",
      privacyConsent: true,
      appliedDate: "2026-07-04",
      signatureName: "김마리아 (마리아)",
      status: "confirmed"
    },
    {
      name: "박요셉",
      baptismalName: "요셉",
      gender: "남성",
      birthDate: "1979-10-03",
      phone: "010-7000-0002",
      email: "joseph.sample@wyd.local",
      postcode: "06376",
      address: "서울특별시 강남구 밤고개로21길 50",
      addressDetail: "",
      supportFields: ["의료 봉사"],
      supportLanguage: "",
      availability: "주간,야간 관계 없음",
      experience: "간호사 면허 보유, 응급처치 교육 이수",
      privacyConsent: true,
      appliedDate: "2026-07-04",
      signatureName: "박요셉 (요셉)",
      status: "submitted"
    },
    {
      name: "이안나",
      baptismalName: "안나",
      gender: "여성",
      birthDate: "1995-02-21",
      phone: "010-7000-0003",
      email: "anna.sample@wyd.local",
      postcode: "06376",
      address: "서울특별시 강남구 세곡동",
      addressDetail: "",
      supportFields: ["통역 및 언어 지원"],
      supportLanguage: "Français, English",
      availability: "야간",
      experience: "프랑스 교환학생 경험, 본당 청년부 활동",
      privacyConsent: true,
      appliedDate: "2026-07-04",
      signatureName: "이안나 (안나)",
      status: "confirmed"
    },
    {
      name: "최베드로",
      baptismalName: "베드로",
      gender: "남성",
      birthDate: "1990-07-19",
      phone: "010-7000-0004",
      email: "peter.sample@wyd.local",
      postcode: "06376",
      address: "서울특별시 강남구 자곡동",
      addressDetail: "",
      supportFields: ["행사 진행 및 안내"],
      supportLanguage: "",
      availability: "주간",
      experience: "행사장 동선 안내 및 질서 유지 봉사 가능",
      privacyConsent: true,
      appliedDate: "2026-07-04",
      signatureName: "최베드로 (베드로)",
      status: "submitted"
    },
    {
      name: "정루카",
      baptismalName: "루카",
      gender: "남성",
      birthDate: "1985-12-08",
      phone: "010-7000-0005",
      email: "luke.sample@wyd.local",
      postcode: "06376",
      address: "서울특별시 강남구 율현동",
      addressDetail: "",
      supportFields: ["행사 진행 및 안내", "통역 및 언어 지원"],
      supportLanguage: "Italiano, Português",
      availability: "주간,야간 관계 없음",
      experience: "해외 성지순례 인솔 보조 경험",
      privacyConsent: true,
      appliedDate: "2026-07-04",
      signatureName: "정루카 (루카)",
      status: "confirmed"
    },
    {
      name: "오세실리아",
      baptismalName: "세실리아",
      gender: "여성",
      birthDate: "1998-09-15",
      phone: "010-7000-0006",
      email: "cecilia.sample@wyd.local",
      postcode: "06376",
      address: "서울특별시 강남구 수서동",
      addressDetail: "",
      supportFields: ["통역 및 언어 지원", "의료 봉사"],
      supportLanguage: "日本語, 中文",
      availability: "야간",
      experience: "일본어 안내 가능, 응급처치 자격 보유",
      privacyConsent: true,
      appliedDate: "2026-07-04",
      signatureName: "오세실리아 (세실리아)",
      status: "submitted"
    }
  ];

  const created = [];
  for (const sample of samples) {
    const { status, ...vPayload } = sample;
    const volunteer = await upsertVolunteer(vPayload);
    if (volunteer?.id && status !== "submitted") {
      await db.update(tables.volunteers).set({
        status,
        updatedAt: nowIso()
      }).where(eq(tables.volunteers.id, volunteer.id));
      
      const v = await getVolunteer(volunteer.id);
      if (v) created.push(v);
    } else if (volunteer) {
      created.push(volunteer);
    }
  }

  await logAudit(actorFrom(session), "admin_created_volunteer_sample_data", undefined, { count: created.length });
  res.json({
    inserted: created.length,
    volunteers: created.map((v) => visibleVolunteerFor(session, v))
  });
});

app.patch("/api/admin/volunteers/:id/status", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const id = String(req.params.id);
  const status = String(req.body.status ?? "");
  if (!["submitted", "confirmed", "canceled"].includes(status)) return res.status(400).json({ message: "상태 값이 올바르지 않습니다." });
  
  await db.update(tables.volunteers).set({
    status,
    canceledAt: status === "canceled" ? nowIso() : null,
    updatedAt: nowIso()
  }).where(eq(tables.volunteers.id, id));

  await logAudit(actorFrom(session), "admin_changed_volunteer_status", id, { status });
  res.json({ volunteer: visibleVolunteerFor(session, await getVolunteer(id)) });
});

app.put("/api/admin/volunteers/:id", requirePrivacyAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const id = String(req.params.id);
  const volunteer = await upsertVolunteer(req.body as VolunteerPayload, id);
  await logAudit(actorFrom(session), "privacy_admin_updated_volunteer", id);
  res.json({ volunteer });
});

app.get("/api/admin/match-candidates", requireAdmin, async (req, res) => {
  const session = res.locals.session as Session;
  const capacity = Number(req.query.capacity ?? 1);
  const language = String(req.query.language ?? "");
  const bedNeeded = String(req.query.bedNeeded ?? "false") === "true";
  const petAllergy = String(req.query.petAllergy ?? "false") === "true";
  const gender = String(req.query.gender ?? "");
  
  // Select active applications with capacity >= requested
  const rows = await db.select().from(tables.applications).where(
    and(
      sql`${tables.applications.status} != 'canceled'`,
      sql`${tables.applications.capacity} >= ${capacity}`
    )
  );

  const candidates = [];
  for (const row of rows) {
    const appData = await rowToApplication(row);
    let score = 60;
    const reasons: string[] = [`${capacity}명 수용 가능`];
    
    if (language && appData.homestay.languages.includes(language)) {
      score += 15;
      reasons.push(`${language} 가능`);
    }
    if (bedNeeded && appData.homestay.hasBed) {
      score += 15;
      reasons.push("침대 제공 가능");
    }
    if (petAllergy && !appData.homestay.hasPet) {
      score += 10;
      reasons.push("반려동물 없음");
    }
    if (gender && ["상관없음", gender].includes(appData.homestay.preferredGender)) {
      score += 10;
      reasons.push(`성별 조건 적합: ${appData.homestay.preferredGender}`);
    }
    candidates.push({
      application: visibleApplicationFor(session, appData),
      score: Math.min(score, 100),
      reasons
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  res.json({
    role: session.role,
    canViewPersonalData: session.role === "privacy_admin",
    candidates
  });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../client");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// Startup block to initialize database first
async function start() {
  await initDb();
  await encryptExistingPersonalData();
  app.listen(port, () => {
    console.log(`WYD Seoul 2027 Homestay API running on http://127.0.0.1:${port}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
