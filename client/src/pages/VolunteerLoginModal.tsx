import React, { useEffect, useRef, useState } from "react";
import { LogIn, UserRoundCheck } from "lucide-react";
import { api } from "../api.js";
import type { VolunteerPayload } from "../types.js";
import { formatKoreanPhoneNumber } from "../utils/constants.js";

type VolunteerLoginModalProps = {
  onClose: () => void;
  onVerified: (token: string, volunteer: VolunteerPayload) => void;
};

export function VolunteerLoginModal({ onClose, onVerified }: VolunteerLoginModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const data = await api<{ token: string; volunteer: VolunteerPayload }>("/api/volunteers/lookup", {
        method: "POST",
        body: JSON.stringify({ name, phone })
      });
      onVerified(data.token, data.volunteer);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="community-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="volunteer-login-title" onClick={onClose}>
      <section className="community-inquiry-modal volunteer-login-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Volunteer Access</span><h3 id="volunteer-login-title">봉사 일정 전용 로그인</h3></div>
          <button type="button" className="modal-close-button" onClick={onClose}>닫기</button>
        </header>
        <form className="volunteer-login-form" onSubmit={login}>
          <div className="volunteer-login-intro">
            <UserRoundCheck aria-hidden="true" />
            <div><strong>접수한 봉사자 정보를 입력해 주세요.</strong><p>별도 계정 생성 없이 신청서의 성명과 연락처로 확인합니다.</p></div>
          </div>
          <div className="grid two">
            <label>
              성명
              <input ref={nameInputRef} required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" />
            </label>
            <label>
              연락처
              <input required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(formatKoreanPhoneNumber(event.target.value))} placeholder="010-0000-0000" />
            </label>
          </div>
          {message && <p className="error" role="alert">{message}</p>}
          <div className="community-modal-actions volunteer-login-actions">
            <button type="button" className="secondary" onClick={onClose}>취소</button>
            <button type="submit" className="primary" disabled={busy || !name.trim() || phone.replace(/\D/g, "").length < 10}>
              <LogIn size={18} /> {busy ? "확인 중" : "봉사자 로그인"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
