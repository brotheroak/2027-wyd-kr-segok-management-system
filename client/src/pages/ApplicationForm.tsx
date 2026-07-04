import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, User, Users, Home, FileText, Heart, Search, ChevronLeft, ChevronRight, Church, ShieldCheck, MapPinned, XCircle } from "lucide-react";
import { ApplicationPayload, DistrictInfo, FamilyMember } from "../types.js";
import { api } from "../api.js";
import { openKakaoPostcode } from "../utils/postcode.js";
import { today, languages, formatKoreanPhoneNumber } from "../utils/constants.js";
import { districtBansByNo, districtGuideSections, districtLabel, districtOptions, districtName, makeManualDistrict } from "../utils/districts.js";
import { SectionTitle, FieldLabel, DateSelect, RequiredMark, Select } from "../components/FormFields.js";
import { Toggle } from "../components/Toggle.js";

type ApplicationFormProps = {
  initial: ApplicationPayload;
  submitLabel: string;
  pinRequired?: boolean;
  mode?: "wizard" | "full";
  onSubmit: (payload: ApplicationPayload) => Promise<void>;
};

export function ApplicationForm({ initial, submitLabel, pinRequired = false, mode = "wizard", onSubmit }: ApplicationFormProps) {
  const [form, setForm] = useState<ApplicationPayload>(initial);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pinConfirm, setPinConfirm] = useState(initial.representative.applicantPin ?? "");
  const [districtManual, setDistrictManual] = useState(initial.district?.confidence === "manual");
  const [districtGuideOpen, setDistrictGuideOpen] = useState(false);
  const stepBodyRef = useRef<HTMLDivElement>(null);
  const districtRequestId = useRef(0);

  useEffect(() => {
    setForm(initial);
    setPinConfirm(initial.representative.applicantPin ?? "");
    setDistrictManual(initial.district?.confidence === "manual");
    setStep(1);
  }, [initial]);

  useEffect(() => {
    if (districtManual) return;
    const address = form.representative.address.trim();
    const addressDetail = form.representative.addressDetail?.trim() ?? "";

    if (!address) {
      setForm((prev) => prev.district ? { ...prev, district: undefined } : prev);
      return;
    }

    const requestId = ++districtRequestId.current;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api<{ district: DistrictInfo }>("/api/district/assign", {
          method: "POST",
          body: JSON.stringify({ address, addressDetail })
        });
        if (requestId !== districtRequestId.current) return;
        setForm((prev) => ({ ...prev, district: result.district }));
      } catch {
        // The server re-runs district assignment at submit time, so a transient lookup
        // failure should not block users from completing the form.
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [form.representative.address, form.representative.addressDetail, districtManual]);

  const update = (path: string, value: unknown) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      const parts = path.split(".");
      let target: any = next;
      parts.slice(0, -1).forEach((part) => {
        target = target[part];
      });
      target[parts.at(-1)!] = value;
      return next;
    });
  };

  const updateMember = (index: number, key: keyof FamilyMember, value: string) => {
    const next = structuredClone(form);
    next.members[index][key] = value;
    next.homestay.householdTotal = next.members.length;
    setForm(next);
  };

  const addMember = () =>
    setForm((prev) => ({
      ...prev,
      members: [...prev.members, { relationship: "", name: "", baptismalName: "", birthDate: "", gender: "" }],
      homestay: { ...prev.homestay, householdTotal: prev.members.length + 1 }
    }));

  const removeMember = (index: number) =>
    setForm((prev) => {
      const members = prev.members.filter((_, i) => i !== index);
      return { ...prev, members, homestay: { ...prev.homestay, householdTotal: members.length } };
    });

  const toggleLanguage = (language: string) => {
    const current = form.homestay.languages;
    const next = current.includes(language) ? current.filter((item) => item !== language) : [...current, language];
    update("homestay.languages", next.length ? next : ["한국어"]);
  };

  const selectedDistrictNo = form.district?.no ?? "13";
  const selectedDistrictBans = districtBansByNo[selectedDistrictNo] ?? districtBansByNo["13"];
  const selectedDistrictBan = form.district?.ban && selectedDistrictBans.includes(form.district.ban)
    ? form.district.ban
    : selectedDistrictBans[0];

  const updateDistrictNo = (no: string) => {
    setDistrictManual(true);
    setForm((prev) => ({
      ...prev,
      district: makeManualDistrict(no)
    }));
  };

  const updateDistrictBan = (ban: string) => {
    setDistrictManual(true);
    setForm((prev) => ({
      ...prev,
      district: makeManualDistrict(prev.district?.no ?? "13", ban)
    }));
  };

  const resetDistrictAuto = () => {
    districtRequestId.current += 1;
    setDistrictManual(false);
    setForm((prev) => ({ ...prev, district: undefined }));
  };

  const openAddress = () =>
    openKakaoPostcode({
      fallbackAddress: form.representative.address,
      detailInputId: "homestay-address-detail",
      onComplete: (postcode, address) => {
        update("representative.postcode", postcode);
        update("representative.address", address);
      }
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "wizard" && !validateStep(step)) return;
    if (mode === "full" && !validateAll()) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    { id: 1, title: "신앙 확인 및 동의", icon: <CheckCircle2 size={18} /> },
    { id: 2, title: "신청자 인적사항", icon: <User size={18} /> },
    { id: 3, title: "가족 구성", icon: <Users size={18} /> },
    { id: 4, title: "홈스테이 여건", icon: <Home size={18} /> },
    { id: 5, title: "서명 및 완료", icon: <FileText size={18} /> }
  ];

  const validateStep = (currentStep: number) => {
    setError("");
    if (currentStep === 1) {
      if (!form.confirmations.period || !form.confirmations.breakfast || !form.confirmations.faithCommunity)
        return setError("세 가지 필수 확인 사항에 모두 동의해 주셔야 신청이 가능합니다."), false;
    }
    if (currentStep === 2) {
      if (!form.representative.name.trim()) return setError("가족대표 성명을 입력해 주세요."), false;
      if (!form.representative.gender) return setError("가족대표 성별을 선택해 주세요."), false;
      if (!form.representative.birthDate) return setError("가족대표 생년월일을 입력해 주세요."), false;
      if (!form.representative.phone.trim()) return setError("가족대표 연락처를 입력해 주세요."), false;
      if (pinRequired && !/^\d{4}$/.test(form.representative.applicantPin ?? ""))
        return setError("접수 확인용 숫자 비밀번호 4자리를 입력해 주세요."), false;
      if (pinRequired && form.representative.applicantPin !== pinConfirm) return setError("비밀번호 확인이 일치하지 않습니다."), false;
      if (!form.representative.address.trim()) return setError("주소를 입력해 주세요."), false;
    }
    if (currentStep === 3) {
      if (!form.members.length) return setError("가족구성원을 1명 이상 입력해 주세요."), false;
      if (form.members.some((member) => !member.relationship.trim() || !member.name.trim() || !member.birthDate || !member.gender)) {
        return setError("가족구성원의 관계, 성명, 생년월일, 성별을 모두 입력해 주세요."), false;
      }
    }
    if (currentStep === 4) {
      if (form.homestay.housingType === "기타" && !form.homestay.housingTypeOther?.trim()) return setError("기타 주거형태를 입력해 주세요."), false;
      if (!form.homestay.capacity || form.homestay.capacity < 1) return setError("가능한 인원 수를 입력해 주세요."), false;
      if (!form.homestay.spaceDescription.trim() || form.homestay.spaceDescription.trim().length < 10)
        return setError("제공 가능한 공간 설명을 10자 이상 입력해 주세요."), false;
      if (!form.homestay.languages.length) return setError("가능한 언어를 1개 이상 선택해 주세요."), false;
      if (form.homestay.hasPet && !form.homestay.petDescription?.trim()) return setError("반려동물이 있는 경우 설명을 입력해 주세요."), false;
    }
    if (currentStep === 5) {
      if (!form.confirmations.signatureName.trim()) return setError("신청자 서명을 입력해 주세요."), false;
    }
    return true;
  };

  const validateAll = () => {
    for (const currentStep of steps.map((item) => item.id)) {
      if (!validateStep(currentStep)) return false;
    }
    return true;
  };

  const scrollToStepBody = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = stepBodyRef.current;
        if (!target) return;
        const offset = window.innerWidth <= 720 ? 14 : 24;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
      });
    });
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length));
    scrollToStepBody();
  };

  const previousStep = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
    scrollToStepBody();
  };

  const consentPanel = (
    <div className="application-step-panel p-8 sm:p-10 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-50 border border-gold-200 text-gold-700 mx-auto">
          <Church size={34} />
        </div>
        <h3 className="font-serif font-black text-2xl text-catholic-navy">꼭 확인해주세요 (호스트 동의 의무사항)</h3>
        <p className="text-gray-500 text-sm leading-relaxed max-w-3xl mx-auto">
          호스트 신청 이전에, 한국 가톨릭 신앙 공동체로서 아래 세 가지 조항을 꼼꼼히 확인하고 수용해 주시길 부탁드립니다.
        </p>
      </div>
      <div className="space-y-5">
        <div className="host-duty-card">
          <span>1. 홈스테이 기본 기간 준수</span>
          <p>
            홈스테이 공식 기간은 <strong className="text-emphasis">2027년 8월 1일 (일) ~ 9일 (월)</strong>까지 약 8박 9일간 입니다. 공동체
            사정 또는 순례자 항공 일정에 따라 전후로 소폭 증감될 수 있음을 확인합니다.
          </p>
          <Toggle label="위 기간 안내를 확인하고 동의합니다." checked={form.confirmations.period} onChange={(value) => update("confirmations.period", value)} />
        </div>
        <div className="host-duty-card">
          <span>2. 간단한 아침식사(조식) 무료 제공</span>
          <p>
            호스트 가정은 본당 젊은이 순례자에게 <strong className="text-emphasis">매일 아침 간단한 아침식사 (식빵, 버터/잼, 우유, 시리얼 등)을 성의껏 제공</strong>해야 합니다. (점심과 저녁은 행사본부에서 배부되는 식권 등으로 해결하게 됩니다)
          </p>
          <Toggle label="조식 제공 의무를 확인하고 동의합니다." checked={form.confirmations.breakfast} onChange={(value) => update("confirmations.breakfast", value)} />
        </div>
        <div className="host-duty-card">
          <span>3. 공동체적 신앙 활동 선언</span>
          <p>
            홈스테이는 단순히 숙박 공간을 빌려주는 에어비앤비 같은 서비스가 아닙니다. 전 세계의 젊은 카톨릭 청년들을 주님 안에서 환대하는
            <strong className="text-emphasis">본당 신앙 실천 활동이자 사랑의 나눔</strong>임을 고백하고 동참합니다.
          </p>
          <Toggle label="공동체적 신앙 활동의 의미를 확인하고 동의합니다." checked={form.confirmations.faithCommunity} onChange={(value) => update("confirmations.faithCommunity", value)} />
        </div>
      </div>
    </div>
  );

  const representativePanel = (
    <div className="application-step-panel applicant-info-panel p-8 sm:p-10 space-y-7">
      <SectionTitle icon={<User />} title="가족대표(신청인) 인적 사항 입력" />
      <div className="applicant-info-grid">
        <label>
          <FieldLabel required>대표 성명</FieldLabel>
          <input required value={form.representative.name} onChange={(e) => update("representative.name", e.target.value)} placeholder="홍길동" />
        </label>
        <label>
          <FieldLabel optional>대표 세례명</FieldLabel>
          <input value={form.representative.baptismalName} onChange={(e) => update("representative.baptismalName", e.target.value)} placeholder="데레사 (또는 비워둠)" />
        </label>
        <fieldset className="button-field">
          <legend>
            <FieldLabel required>성별</FieldLabel>
          </legend>
          <div className="segmented-buttons">
            {["남성", "여성"].map((gender) => (
              <button
                key={gender}
                type="button"
                className={form.representative.gender === gender ? "segment-option active" : "segment-option"}
                onClick={() => update("representative.gender", gender)}
              >
                {gender === "남성" ? "남성 (Brother)" : "여성 (Sister)"}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <FieldLabel required>생년월일</FieldLabel>
          <DateSelect value={form.representative.birthDate} onChange={(value) => update("representative.birthDate", value)} />
        </label>
        <label>
          <FieldLabel required>연락처 (휴대전화)</FieldLabel>
          <input required inputMode="tel" value={form.representative.phone} onChange={(e) => update("representative.phone", formatKoreanPhoneNumber(e.target.value))} placeholder="010-1234-5678" />
          <small>번호만 입력하시면 조회시에도 사용됩니다.</small>
        </label>
        <label>
          <FieldLabel optional>이메일 주소</FieldLabel>
          <input
            type="email"
            value={form.representative.email ?? ""}
            onChange={(e) => update("representative.email", e.target.value)}
            placeholder="myemail@gmail.com (없으시면 비우셔도 됨)"
          />
        </label>
      </div>
      <label className="address-lookup-field">
        <FieldLabel required>거주지 주소</FieldLabel>
        <div className="address-lookup-row">
          <input
            required
            value={form.representative.address}
            onChange={(e) => update("representative.address", e.target.value)}
            placeholder="서울특별시 강남구 세곡동 또는 도로명 주소"
          />
          <button type="button" className="secondary address-search-button" onClick={openAddress}>
            <Search size={20} /> 주소 찾기
          </button>
        </div>
        <small>세곡동성당(서울특별시 강남구 헌릉로618길 34) 인근 가정이 최우선으로 매핑됩니다.</small>
      </label>
      <div className="address-extra-row">
        <label className="postcode-field">
          <FieldLabel>우편번호</FieldLabel>
          <input value={form.representative.postcode} onChange={(e) => update("representative.postcode", e.target.value)} placeholder="우편번호" />
        </label>
        <label>
          <FieldLabel>상세주소</FieldLabel>
          <input id="homestay-address-detail" value={form.representative.addressDetail} onChange={(e) => update("representative.addressDetail", e.target.value)} placeholder="동/호수 등 상세 주소" />
        </label>
      </div>
      <div className="district-assignment-panel">
        <div className="district-assignment-head">
          <div>
            <span>{districtManual ? "수동 수정 구역반" : "자동 매핑 구역반"}</span>
            <strong>{form.district?.label ?? "주소 입력 후 자동 판별"}</strong>
          </div>
          <em className={districtManual ? "manual" : "auto"}>{districtManual ? "수동" : "자동"}</em>
        </div>
        <div className="district-assignment-controls">
          <label>
            <FieldLabel>구역</FieldLabel>
            <Select
              value={selectedDistrictNo}
              onChange={updateDistrictNo}
              options={districtOptions}
              renderOption={(no) => (no === "99" ? "구역외 (99구역)" : `${districtName(no)}`)}
            />
          </label>
          <label>
            <FieldLabel>반</FieldLabel>
            <Select
              value={selectedDistrictBan}
              onChange={updateDistrictBan}
              options={selectedDistrictBans}
              renderOption={(ban) => selectedDistrictNo === "99" ? "구역외" : districtLabel(selectedDistrictNo, ban)}
            />
          </label>
          <button type="button" className="secondary district-auto-button" onClick={resetDistrictAuto}>
            주소 기준 다시 매핑
          </button>
        </div>
        {form.district?.reason && <p>{form.district.reason}</p>}
        <button type="button" className="district-guide-link" onClick={() => setDistrictGuideOpen(true)}>
          <MapPinned size={16} /> 구역반 편성 안내 보기
        </button>
      </div>
      <div className="pin-help-box">
        <ShieldCheck size={20} />
        <div>
          <strong>신청서 수정 및 조회용 비밀번호 설정</strong>
          <p>
            이메일 없이도 <b>성명 + 전화번호 + 설정하신 숫자 4자리</b>를 통해 추후 본인의 신청 정보를 자유롭게 확인, 수정 또는 취소할 수 있습니다. 잊어버리지 않을 번호로 지정해 주세요.
          </p>
        </div>
      </div>
      <div className="applicant-info-grid">
        <label>
          <FieldLabel required={pinRequired}>비밀번호 숫자 4자리</FieldLabel>
          <input
            required={pinRequired}
            inputMode="numeric"
            maxLength={4}
            pattern={pinRequired ? "\\d{4}" : undefined}
            type="password"
            value={form.representative.applicantPin ?? ""}
            onChange={(e) => update("representative.applicantPin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
          />
        </label>
        <label>
          <FieldLabel required={pinRequired}>비밀번호 확인</FieldLabel>
          <input
            required={pinRequired}
            inputMode="numeric"
            maxLength={4}
            pattern={pinRequired ? "\\d{4}" : undefined}
            type="password"
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="••••"
          />
        </label>
      </div>
    </div>
  );

  const membersPanel = (
    <div className="application-step-panel p-8 sm:p-10 space-y-6">
      <SectionTitle icon={<Users />} title="가족구성원" action={<button type="button" className="secondary" onClick={addMember}>구성원 추가</button>} />
      <div className="member-list">
        {form.members.map((member, index) => (
          <div className="member" key={index}>
            <div className="member-head">
              <strong>{index + 1}번 구성원</strong>
              {form.members.length > 1 && index > 0 && (
                <button type="button" className="ghost danger" onClick={() => removeMember(index)}>
                  삭제
                </button>
              )}
            </div>
            <div className="grid five">
              <label>
                <FieldLabel required>관계</FieldLabel>
                {index === 0 ? (
                  <input required readOnly value="가족대표" className="disabled-input" style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }} />
                ) : (
                  <Select value={member.relationship} onChange={(value) => updateMember(index, "relationship", value)} options={["배우자", "자녀", "부모", "기타"]} />
                )}
              </label>
              <label>
                <FieldLabel required>성명</FieldLabel>
                <input required value={member.name} onChange={(e) => updateMember(index, "name", e.target.value)} />
              </label>
              <label>
                <FieldLabel optional>세례명</FieldLabel>
                <input value={member.baptismalName} onChange={(e) => updateMember(index, "baptismalName", e.target.value)} placeholder="요셉 (또는 비워둠)" />
              </label>
              <label>
                <FieldLabel required>생년월일</FieldLabel>
                <DateSelect value={member.birthDate} onChange={(value) => updateMember(index, "birthDate", value)} />
              </label>
              <label>
                <FieldLabel required>성별</FieldLabel>
                <Select value={member.gender} onChange={(value) => updateMember(index, "gender", value)} options={["남성", "여성"]} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const homestayPanel = (
    <div className="application-step-panel p-8 sm:p-10 space-y-6">
      <SectionTitle icon={<Home />} title="주거 및 수용 상세" />
      <div className="grid three">
        <label>
          <FieldLabel required>주거형태</FieldLabel>
          <Select value={form.homestay.housingType} onChange={(value) => update("homestay.housingType", value)} options={["아파트", "단독주택", "기타"]} />
        </label>
        {form.homestay.housingType === "기타" && (
          <label>
            <FieldLabel required>기타 주거형태</FieldLabel>
            <input required value={form.homestay.housingTypeOther} onChange={(e) => update("homestay.housingTypeOther", e.target.value)} />
          </label>
        )}
        <label>
          <FieldLabel required>가능한 인원 수</FieldLabel>
          <input required type="number" min="1" max="20" value={form.homestay.capacity} onChange={(e) => update("homestay.capacity", Number(e.target.value))} />
        </label>
        <label>
          <FieldLabel required>원하는 성별</FieldLabel>
          <Select value={form.homestay.preferredGender} onChange={(value) => update("homestay.preferredGender", value)} options={["상관없음", "남성", "여성"]} />
        </label>
      </div>
      <div className="toggle-grid">
        <Toggle label="반려동물 있음" checked={form.homestay.hasPet} onChange={(value) => update("homestay.hasPet", value)} />
        <Toggle label="침대 제공 가능" checked={form.homestay.hasBed} onChange={(value) => update("homestay.hasBed", value)} />
      </div>
      {form.homestay.hasPet && (
        <label>
          <FieldLabel>반려동물 설명</FieldLabel>
          <input value={form.homestay.petDescription} onChange={(e) => update("homestay.petDescription", e.target.value)} placeholder="예: 소형견 1마리" />
        </label>
      )}
      <fieldset className="choice-field">
        <legend>가능한 언어</legend>
        <div className="chips">
          {languages.map((language) => (
            <button
              type="button"
              key={language}
              className={form.homestay.languages.includes(language) ? "chip selected" : "chip"}
              onClick={() => toggleLanguage(language)}
            >
              {language}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <FieldLabel required>제공 가능한 공간 설명</FieldLabel>
        <textarea
          required
          minLength={10}
          rows={6}
          value={form.homestay.spaceDescription}
          onChange={(e) => update("homestay.spaceDescription", e.target.value)}
          placeholder="예: 독립된 작은 방 1개, 거실과 욕실 공동 사용 가능"
        />
      </label>
    </div>
  );

  const reviewPanel = (
    <div className="application-step-panel p-8 sm:p-10 space-y-6 review-panel">
      <SectionTitle icon={<FileText />} title="작성 내용 확인, 서명 및 완료" />
      <div className="review-hero">
        <CheckCircle2 size={34} />
        <div>
          <strong>제출 전 마지막 확인입니다</strong>
          <span>입력하신 내용을 검토한 뒤 확인 사항에 체크하고 서명해 주세요.</span>
        </div>
      </div>
      <div className="review-grid">
        <div className="review-card">
          <span>가족대표</span>
          <strong>
            {form.representative.name || "미입력"} {form.representative.baptismalName ? `(${form.representative.baptismalName})` : ""}
          </strong>
          <p>{form.representative.phone || "연락처 미입력"}</p>
        </div>
        <div className="review-card">
          <span>주소</span>
          <strong>{form.representative.address || "주소 미입력"}</strong>
          <p>{form.representative.addressDetail}</p>
        </div>
        <div className="review-card">
          <span>가족 구성</span>
          <strong>{form.members.length}명</strong>
          <p>{form.members.map((member) => member.name).filter(Boolean).join(", ") || "구성원 미입력"}</p>
        </div>
        <div className="review-card">
          <span>수용 조건</span>
          <strong>
            {form.homestay.capacity}명 · {form.homestay.hasBed ? "침대 가능" : "침대 없음"}
          </strong>
          <p>{form.homestay.languages.join(", ")}</p>
        </div>
      </div>
      <dl className="details review-details">
        <dt>주거형태</dt>
        <dd>{form.homestay.housingType === "기타" ? form.homestay.housingTypeOther : form.homestay.housingType}</dd>
        <dt>반려동물</dt>
        <dd>{form.homestay.hasPet ? form.homestay.petDescription || "있음" : "없음"}</dd>
        <dt>공간 설명</dt>
        <dd>{form.homestay.spaceDescription || "미입력"}</dd>
      </dl>
      <div className="grid two">
        <label>
          <FieldLabel required>신청일</FieldLabel>
          <input required type="date" value={form.confirmations.appliedDate} onChange={(e) => update("confirmations.appliedDate", e.target.value)} />
        </label>
        <label>
          <FieldLabel required>신청자 서명</FieldLabel>
          <input required value={form.confirmations.signatureName} onChange={(e) => update("confirmations.signatureName", e.target.value)} placeholder="성명 입력" />
        </label>
      </div>
    </div>
  );

  const panels = [consentPanel, representativePanel, membersPanel, homestayPanel, reviewPanel];

  return (
    <form className={mode === "wizard" ? "wizard-form" : "form-stack"} onSubmit={submit}>
      {mode === "wizard" ? (
        <div id="application-form-container" className="bg-white rounded-3xl shadow-xl border border-gold-100 overflow-hidden max-w-6xl mx-auto transition-all duration-300">
          <div className="bg-catholic-navy px-8 py-10 text-white relative overflow-hidden" id="form-header">
            <Heart className="form-header-heart" aria-hidden="true" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="text-gold-300 font-sans text-xs tracking-[0.22em] uppercase font-bold">2027 Seoul World Youth Day</span>
                <h3 className="font-serif font-black text-3xl sm:text-4xl mt-3">세곡동성당 홈스테이 호스트 신청서</h3>
                <p className="text-white/70 text-sm mt-3 max-w-3xl leading-relaxed font-sans">
                  서울 WYD 젊은 순례자들을 따뜻하게 맞이해 주실 우리 세곡동 공동체 가정을 초대합니다.
                </p>
              </div>
              <div className="font-serif text-gold-200 text-4xl font-black">
                {step}
                <span className="text-white/25 text-2xl">/{steps.length}</span>
              </div>
            </div>
            <div className="wizard-steps relative z-10 mt-9" aria-label="신청 단계">
              {steps.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`wizard-step ${
                    step === item.id
                      ? "active"
                      : step > item.id
                        ? "done"
                        : ""
                  }`}
                  onClick={() => {
                    if (step <= item.id) return;
                    setStep(item.id);
                    scrollToStepBody();
                  }}
                >
                  <strong className="wizard-step-number" aria-label={step > item.id ? `${item.title} 완료` : `${item.title} 단계`}>
                    {step > item.id ? <CheckCircle2 size={22} strokeWidth={2.6} /> : item.id}
                  </strong>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div ref={stepBodyRef} className="application-step-body min-h-[430px]">{panels[step - 1]}</div>

          {error && <p className="mx-8 mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-3">
            <button type="button" className="secondary" onClick={previousStep} disabled={step === 1 || busy}>
              <ChevronLeft size={18} /> 이전
            </button>
            {step < steps.length ? (
              <button type="button" className="primary" onClick={nextStep}>
                다음 단계 <ChevronRight size={20} />
              </button>
            ) : (
              <button className="primary" disabled={busy}>
                {submitLabel} <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {panels.map((panel, index) => (
            <React.Fragment key={index}>{panel}</React.Fragment>
          ))}
          {error && <p className="error">{error}</p>}
          <div className="sticky-actions">
            <button className="primary large" disabled={busy}>
              {submitLabel} <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}
      {districtGuideOpen && (
        <div className="district-guide-modal" role="dialog" aria-modal="true" aria-labelledby="district-guide-title" onClick={() => setDistrictGuideOpen(false)}>
          <div className="district-guide-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="district-guide-head">
              <div>
                <span>세곡동성당 구역반 편성 기준</span>
                <h3 id="district-guide-title">구역반 안내</h3>
              </div>
              <button type="button" className="ghost" onClick={() => setDistrictGuideOpen(false)} aria-label="구역반 안내 닫기">
                <XCircle size={22} />
              </button>
            </div>
            <div className="district-guide-current">
              <MapPinned size={18} />
              <span>현재 입력 주소 기준</span>
              <strong>{form.district?.label ?? "주소 입력 후 자동 판별"}</strong>
            </div>
            <div className="district-guide-body">
              {districtGuideSections.map((section) => (
                <section
                  key={section.no}
                  className={section.no === selectedDistrictNo ? "district-guide-section active" : "district-guide-section"}
                >
                  <div className="district-guide-section-head">
                    <strong>{section.name}</strong>
                    <span>{section.areas.join(" · ")}</span>
                  </div>
                  <dl>
                    {section.bans.map((item) => (
                      <React.Fragment key={item.ban}>
                        <dt>{item.ban}반</dt>
                        <dd>{item.description}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
