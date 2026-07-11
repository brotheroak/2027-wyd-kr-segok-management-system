import React, { useState } from "react";
import { Mail, LogIn } from "lucide-react";
import { api } from "../api.js";
import { ApplicationPayload } from "../types.js";

type LoginPanelProps = {
  title: string;
  onVerified: (token: string, email: string, application: ApplicationPayload | null) => void;
};

export function LoginPanel({ title, onVerified }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = async (targetEmail = email) => {
    setBusy(true);
    try {
      const data = await api<{ message: string; devCode?: string }>("/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: targetEmail })
      });
      setSentCode(data.devCode ?? "");
      setMessage(data.message);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const data = await api<{ token: string; email: string; application: ApplicationPayload | null }>("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email, code })
      });
      onVerified(data.token, data.email, data.application);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel login-panel">
      <div className="section-title">
        <span className="section-title-icon" aria-hidden="true"><Mail /></span>
        <div>
          <h3>{title}</h3>
          <p>이메일 인증으로 본인 신청서를 확인합니다.</p>
        </div>
      </div>
      <div className="field-row">
        <label>
          이메일
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </label>
        <button className="primary" onClick={() => requestCode()} disabled={busy || !email}>인증번호 받기</button>
      </div>
      <button
        className="test-code-button"
        onClick={() => {
          const testEmail = "test-homestay@wyd.local";
          setEmail(testEmail);
          requestCode(testEmail);
        }}
        disabled={busy}
      >
        테스트용 이메일 인증번호 생성
      </button>
      {(message || sentCode) && <p className="notice">{message} {sentCode && <strong>인증번호 {sentCode}</strong>}</p>}
      <div className="field-row">
        <label>
          인증번호
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6자리" />
        </label>
        <button className="primary" onClick={verify} disabled={busy || code.length < 6}><LogIn size={18} /> 확인</button>
      </div>
    </div>
  );
}
