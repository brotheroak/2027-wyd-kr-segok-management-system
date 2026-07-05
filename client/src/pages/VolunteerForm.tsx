import React, { useState, useEffect } from "react";
import { CheckCircle2, Search, User, ClipboardList, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import { VolunteerPayload } from "../types.js";
import { calculateAge } from "../utils/age.js";
import { openKakaoPostcode } from "../utils/postcode.js";
import { today, emptyVolunteer, volunteerFields, volunteerLanguageOptions, availabilityOptions, splitVolunteerLanguages, formatKoreanPhoneNumber } from "../utils/constants.js";
import { SectionTitle, FieldLabel, DateSelect, RequiredMark } from "../components/FormFields.js";
import { Toggle } from "../components/Toggle.js";

type VolunteerFormProps = {
  onSubmit: (payload: VolunteerPayload) => Promise<void>;
  initial?: VolunteerPayload;
  submitLabel?: string;
};

export function VolunteerForm({ onSubmit, initial, submitLabel = "자원봉사자 신청 접수" }: VolunteerFormProps) {
  const [form, setForm] = useState<VolunteerPayload>(initial ?? emptyVolunteer());
  const [otherLanguageEnabled, setOtherLanguageEnabled] = useState(false);
  const [otherLanguage, setOtherLanguage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm(initial);
      const langs = splitVolunteerLanguages(initial.supportLanguage);
      const defaultLangs = new Set(volunteerLanguageOptions);
      const others = langs.filter(l => !defaultLangs.has(l));
      if (others.length > 0) {
        setOtherLanguageEnabled(true);
        setOtherLanguage(others.join(", "));
      } else {
        setOtherLanguageEnabled(false);
        setOtherLanguage("");
      }
    } else {
      setForm(emptyVolunteer());
      setOtherLanguageEnabled(false);
      setOtherLanguage("");
    }
  }, [initial]);

  const age = calculateAge(form.birthDate);
  const signatureText = `${form.name}${form.baptismalName ? ` (${form.baptismalName})` : ""}`.trim();
  const selectedSupportLanguages = splitVolunteerLanguages(form.supportLanguage);
  const appliedDateText = form.appliedDate
    ? `${form.appliedDate.slice(0, 4)}년 ${form.appliedDate.slice(5, 7)}월 ${form.appliedDate.slice(8, 10)}일`
    : "202X년 XX월 XX일";

  const update = (key: keyof VolunteerPayload, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" || key === "baptismalName") {
        const name = key === "name" ? String(value) : prev.name;
        const baptismalName = key === "baptismalName" ? String(value) : prev.baptismalName;
        next.signatureName = `${name}${baptismalName ? ` (${baptismalName})` : ""}`.trim();
      }
      return next;
    });
  };

  const toggleField = (field: string) => {
    const next = form.supportFields.includes(field)
      ? form.supportFields.filter((item) => item !== field)
      : [...form.supportFields, field];
    setForm((prev) => ({
      ...prev,
      supportFields: next,
      supportLanguage: next.includes("통역 및 언어 지원") ? prev.supportLanguage : ""
    }));
    if (!next.includes("통역 및 언어 지원")) {
      setOtherLanguageEnabled(false);
      setOtherLanguage("");
    }
  };

  const toggleVolunteerLanguage = (language: string) => {
    const next = selectedSupportLanguages.includes(language)
      ? selectedSupportLanguages.filter((item) => item !== language)
      : [...selectedSupportLanguages, language];
    update("supportLanguage", next.join(", "));
  };

  const openAddress = () =>
    openKakaoPostcode({
      fallbackAddress: form.address,
      detailInputId: "volunteer-address-detail",
      onComplete: (postcode, address) => {
        update("postcode", postcode);
        update("address", address);
      }
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("성명을 입력해 주세요.");
    if (!form.gender) return setError("성별을 선택해 주세요.");
    if (!form.birthDate) return setError("생년월일을 입력해 주세요.");
    if (!form.phone.trim()) return setError("연락처를 입력해 주세요.");
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      return setError("연락처는 9자리에서 11자리의 숫자여야 합니다.");
    }
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError("올바른 이메일 주소 형식을 입력해 주세요.");
    }
    if (!form.address.trim()) return setError("주소를 입력해 주세요.");
    if (!form.supportFields.length) return setError("지원 분야를 1개 이상 선택해 주세요.");
    const supportLanguageValue = [
      ...selectedSupportLanguages,
      ...(otherLanguageEnabled && otherLanguage.trim() ? [otherLanguage.trim()] : [])
    ].join(", ");
    if (form.supportFields.includes("통역 및 언어 지원") && !supportLanguageValue)
      return setError("통역 및 언어 지원을 선택한 경우 지원 언어를 1개 이상 선택해 주세요.");
    if (otherLanguageEnabled && !otherLanguage.trim())
      return setError("기타 언어를 선택한 경우 지원 가능한 언어를 입력해 주세요.");
    if (!form.availability) return setError("활동 가능 시간을 선택해 주세요.");
    if (!form.experience.trim()) return setError("봉사 경력 및 보유 재능을 입력해 주세요.");
    if (!form.privacyConsent) return setError("개인정보 수집 및 활용에 동의해 주세요.");
    if (!signatureText) return setError("성명을 입력하면 신청인 서명이 자동 생성됩니다.");
    setBusy(true);
    try {
      await onSubmit({ ...form, supportLanguage: supportLanguageValue, appliedDate: today, signatureName: signatureText });
      setForm(emptyVolunteer());
      setOtherLanguageEnabled(false);
      setOtherLanguage("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="volunteer-form" onSubmit={submit}>
      <div className="application-step-panel applicant-info-panel p-5 sm:p-10 space-y-7">
        <SectionTitle icon={<User />} title="1. 인적 사항" />
        <div className="applicant-info-grid">
          <label>
            <FieldLabel required>성명</FieldLabel>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="홍길동" />
          </label>
          <label>
            <FieldLabel optional>세례명</FieldLabel>
            <input value={form.baptismalName} onChange={(e) => update("baptismalName", e.target.value)} placeholder="요셉" />
          </label>
          <fieldset className="button-field">
            <legend>
              <FieldLabel required>성별</FieldLabel>
            </legend>
            <div className="segmented-buttons two-cols">
              {["남성", "여성"].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  className={form.gender === gender ? "segment-option active" : "segment-option"}
                  onClick={() => update("gender", gender)}
                >
                  {gender}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <FieldLabel required>생년월일</FieldLabel>
            <DateSelect value={form.birthDate} onChange={(value) => update("birthDate", value)} />
            <small>연령 만 {age || "XX"}세</small>
          </label>
          <label>
            <FieldLabel required>연락처</FieldLabel>
            <input required inputMode="tel" value={form.phone} onChange={(e) => update("phone", formatKoreanPhoneNumber(e.target.value))} placeholder="010-1234-5678" />
          </label>
          <label>
            <FieldLabel optional>이메일</FieldLabel>
            <input type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} placeholder="myemail@gmail.com" />
          </label>
        </div>
        <label className="address-lookup-field">
          <FieldLabel required>주소</FieldLabel>
          <div className="address-lookup-row">
            <input
              required
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="서울특별시 강남구 세곡동 또는 도로명 주소"
            />
            <button type="button" className="secondary address-search-button" onClick={openAddress}>
              <Search size={20} /> 주소 찾기
            </button>
          </div>
        </label>
        <div className="address-extra-row">
          <label className="postcode-field">
            <FieldLabel>우편번호</FieldLabel>
            <input value={form.postcode} onChange={(e) => update("postcode", e.target.value)} placeholder="우편번호" />
          </label>
          <label>
            <FieldLabel>상세주소</FieldLabel>
            <input id="volunteer-address-detail" value={form.addressDetail} onChange={(e) => update("addressDetail", e.target.value)} placeholder="동/호수 등 상세 주소" />
          </label>
        </div>
      </div>

      <div className="application-step-panel p-8 sm:p-10 space-y-7">
        <SectionTitle icon={<ClipboardList />} title="2. 지원 분야" />
        <div className="volunteer-check-grid">
          {volunteerFields.map((field) => (
            <button
              key={field}
              type="button"
              className={form.supportFields.includes(field) ? "volunteer-check-card active" : "volunteer-check-card"}
              onClick={() => toggleField(field)}
              aria-pressed={form.supportFields.includes(field)}
            >
              <i>{form.supportFields.includes(field) && <CheckCircle2 size={16} />}</i>
              <strong>{field}</strong>
              <small>
                {field === "행사 진행 및 안내"
                  ? "대회 기간 내 행사장 안내 및 질서 유지"
                  : field === "통역 및 언어 지원"
                    ? "외국어 안내 및 순례자 소통 지원"
                    : "응급 환자 대응 및 의료 지원"}
              </small>
            </button>
          ))}
        </div>
        {form.supportFields.includes("통역 및 언어 지원") && (
          <fieldset className="choice-field">
            <legend>
              지원 언어 <RequiredMark />
            </legend>
            <div className="chips">
              {volunteerLanguageOptions.map((language) => (
                <button
                  type="button"
                  key={language}
                  className={selectedSupportLanguages.includes(language) ? "chip selected" : "chip"}
                  onClick={() => toggleVolunteerLanguage(language)}
                >
                  {language}
                </button>
              ))}
              <button
                type="button"
                className={otherLanguageEnabled ? "chip selected" : "chip"}
                onClick={() => setOtherLanguageEnabled((value) => !value)}
              >
                기타
              </button>
            </div>
            {otherLanguageEnabled && (
              <label className="volunteer-other-language">
                <FieldLabel required>기타 지원 언어</FieldLabel>
                <input value={otherLanguage} onChange={(e) => setOtherLanguage(e.target.value)} placeholder="지원 가능한 언어를 입력해 주세요" />
              </label>
            )}
          </fieldset>
        )}
      </div>

      <div className="application-step-panel p-8 sm:p-10 space-y-7">
        <SectionTitle icon={<Sparkles />} title="3. 활동 가능 기간 및 역량" />
        <fieldset className="choice-field">
          <legend>활동가능 시간</legend>
          <div className="chips">
            {availabilityOptions.map((option) => (
              <button
                type="button"
                key={option}
                className={form.availability === option ? "chip selected" : "chip"}
                onClick={() => update("availability", option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <FieldLabel required>봉사 경력 및 보유 재능</FieldLabel>
          <textarea
            required
            rows={6}
            value={form.experience}
            onChange={(e) => update("experience", e.target.value)}
            placeholder="성당 내 활동 경력이나 업무 관련 기술, 자격증 등이 있다면 자유롭게 기재해 주세요."
          />
        </label>
      </div>

      <div className="application-step-panel p-8 sm:p-10 space-y-7 review-panel">
        <SectionTitle icon={<ShieldCheck />} title="4. 개인정보 수집 및 활용 동의" />
        <p className="notice">
          본 신청서에 기재된 개인정보는 2027 서울 WYD 자원봉사자 모집, 선발, 교육 및 안내를 위한 목적으로만 사용되며, 관련 법령에 따라 안전하게 관리됩니다.
        </p>
        <Toggle label="개인정보 수집 및 활용에 동의합니다." checked={form.privacyConsent} onChange={(value) => update("privacyConsent", value)} />
        <div className="volunteer-signature-block" aria-label="신청서 서명">
          <p>{appliedDateText}</p>
          <strong>
            신청인 성명(세례명) : {signatureText || "자동 입력"} <span>(서명 / 인)</span>
          </strong>
        </div>
        <div className="volunteer-letter-footer">
          <strong>천주교 서울대교구 세곡동성당 WYD 본당 위원회 귀하</strong>
          <span>서울특별시 강남구 헌릉로618길 34 세곡동성당 / 대표 번호 02-459-8211</span>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="sticky-actions">
        <button className="primary large" disabled={busy}>
          {submitLabel} <ChevronRight size={20} />
        </button>
      </div>
    </form>
  );
}
