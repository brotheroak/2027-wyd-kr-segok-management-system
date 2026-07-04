import React, { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { api } from "../api.js";
import { ApplicationPayload } from "../types.js";

type LookupPanelProps = {
  onFound: (token: string, application: ApplicationPayload) => void;
};

export function LookupPanel({ onFound }: LookupPanelProps) {
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
      const data = await api<{ token: string; application: ApplicationPayload }>("/api/applications/lookup", {
        method: "POST",
        body: JSON.stringify({ name, phone, applicantPin })
      });
      onFound(data.token, data.application);
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
          <p>이메일 없이도 신청자 성명, 연락처, 4자리 비밀번호로 확인합니다.</p>
        </div>
      </div>
      <div className="grid three">
        <label>
          성명
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" />
        </label>
        <label>
          연락처
          <input required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" />
        </label>
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
      </div>
      {message && <p className="error">{message}</p>}
      <div className="lookup-actions">
        <button className="primary large" disabled={busy || applicantPin.length !== 4}>접수 내역 확인 <ChevronRight size={20} /></button>
      </div>
    </form>
  );
}
