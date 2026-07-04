import React, { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { api } from "../api.js";
import { formatKoreanPhoneNumber } from "../utils/constants.js";

type LookupPanelProps = {
  onFound: (token: string, type: "homestay" | "volunteer", data: any) => void;
};

export function LookupPanel({ onFound }: LookupPanelProps) {
  const [lookupType, setLookupType] = useState<"homestay" | "volunteer">("homestay");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [applicantPin, setApplicantPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const url = lookupType === "homestay" ? "/api/applications/lookup" : "/api/volunteers/lookup";
      const data = await api<{ token: string; application?: any; volunteer?: any }>(url, {
        method: "POST",
        body: JSON.stringify(lookupType === "homestay" ? { name, phone, applicantPin } : { name, phone })
      });
      const resultData = lookupType === "homestay" ? data.application : data.volunteer;
      onFound(data.token, lookupType, resultData);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel login-panel" onSubmit={lookup}>
      <div className="section-title">
        <Search />
        <div>
          <h3>접수 내역 조회</h3>
          <p>
            {lookupType === "homestay"
              ? "홈스테이는 신청자 성명, 연락처, 설정한 비밀번호 4자리로 조회합니다."
              : "자원봉사자는 신청자 성명과 연락처로 조회합니다."}
          </p>
        </div>
      </div>
      
      <div className="segmented-buttons lookup-type-selector" style={{ marginBottom: "24px" }}>
        <button
          type="button"
          className={lookupType === "homestay" ? "segment-option active" : "segment-option"}
          onClick={() => { setLookupType("homestay"); setMessage(""); }}
        >
          홈스테이 신청 조회
        </button>
        <button
          type="button"
          className={lookupType === "volunteer" ? "segment-option active" : "segment-option"}
          onClick={() => { setLookupType("volunteer"); setMessage(""); }}
        >
          자원봉사자 신청 조회
        </button>
      </div>

      <div className={lookupType === "homestay" ? "grid three" : "grid two"}>
        <label>
          성명
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" />
        </label>
        <label>
          연락처
          <input required inputMode="tel" value={phone} onChange={(event) => setPhone(formatKoreanPhoneNumber(event.target.value))} placeholder="010-0000-0000" />
        </label>
        {lookupType === "homestay" && (
          <label>
            비밀번호 4자리
            <input
              required
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              type="password"
              value={applicantPin}
              onChange={(event) => setApplicantPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="숫자 4자리"
            />
          </label>
        )}
      </div>
      {message && <p className="error">{message}</p>}
      <div className="lookup-actions">
        <button className="primary large" disabled={busy || (lookupType === "homestay" && applicantPin.length !== 4)}>
          접수 내역 확인 <ChevronRight size={20} />
        </button>
      </div>
    </form>
  );
}
