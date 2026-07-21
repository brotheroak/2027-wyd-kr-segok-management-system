import React, { useState } from "react";
import { Accessibility, CheckCircle2, Church, Clock3, Home, IdCard, KeyRound, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api.js";
import { AppFooter } from "../components/AppFooter.js";
import type { ApplicationPayload } from "../types.js";
import { formatKoreanPhoneNumber } from "../utils/constants.js";
import type { PublicPilgrimCard } from "../utils/pilgrimCardI18n.js";
import { HostPilgrimScanner } from "./HostPilgrimScanner.js";

type AccessMode = "pilgrim" | "host";

type PilgrimAccessPortalProps = {
  fontScale: number;
  setFontScale: (value: number) => void;
  navigate: (path: string) => void;
  initialMode?: AccessMode;
  hostToken?: string;
  hostApplication?: ApplicationPayload | null;
  onHostAuthorized: (token: string, application: ApplicationPayload) => void;
  onHostLogout: () => void;
  onOpenPilgrimCard: (token: string) => void;
};

function extractCardToken(value: string) {
  const input = value.trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    if (parsed.hash.length > 1) return decodeURIComponent(parsed.hash.slice(1));
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "");
  } catch {
    return input.includes("#") ? decodeURIComponent(input.split("#").pop() ?? "") : input;
  }
}

export function PilgrimAccessPortal({
  fontScale,
  setFontScale,
  navigate,
  initialMode = "pilgrim",
  hostToken,
  hostApplication,
  onHostAuthorized,
  onHostLogout,
  onOpenPilgrimCard
}: PilgrimAccessPortalProps) {
  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [cardAccess, setCardAccess] = useState("");
  const [pilgrimMessage, setPilgrimMessage] = useState("");
  const [pilgrimBusy, setPilgrimBusy] = useState(false);
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [hostPin, setHostPin] = useState("");
  const [hostMessage, setHostMessage] = useState("");
  const [hostBusy, setHostBusy] = useState(false);

  const openCard = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = extractCardToken(cardAccess);
    setPilgrimMessage("");
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
      setPilgrimMessage("관리자에게 받은 카드 링크 또는 바코드 접속 코드를 확인해 주세요.");
      return;
    }
    setPilgrimBusy(true);
    try {
      await api<{ pilgrim: PublicPilgrimCard }>("/api/pilgrims/card", { method: "POST", body: JSON.stringify({ token }) });
      onOpenPilgrimCard(token);
    } catch (error) {
      setPilgrimMessage((error as Error).message);
    } finally {
      setPilgrimBusy(false);
    }
  };

  const loginHost = async (event: React.FormEvent) => {
    event.preventDefault();
    setHostBusy(true);
    setHostMessage("");
    try {
      const data = await api<{ token: string; application: ApplicationPayload }>("/api/hosts/login", {
        method: "POST",
        body: JSON.stringify({ name: hostName, phone: hostPhone, applicantPin: hostPin })
      });
      onHostAuthorized(data.token, data.application);
    } catch (error) {
      setHostMessage((error as Error).message);
    } finally {
      setHostBusy(false);
    }
  };

  const hostConfirmed = hostApplication?.status === "confirmed";

  return (
    <div className="pilgrim-portal-shell">
      <header className="topbar pilgrim-portal-topbar">
        <div className="topbar-inner pilgrim-portal-topbar-inner">
          <button type="button" className="brand" onClick={() => navigate("/")} aria-label="신청 첫 화면으로 이동">
            <div className="brand-mark"><Church size={34} /></div>
            <div><p>세곡동성당 WYD 분과</p><h1>순례자 확인 포털</h1></div>
          </button>
          <button type="button" className="secondary pilgrim-portal-home" onClick={() => navigate("/")}><Home size={18} /> 홈페이지</button>
          <div className="accessibility" aria-label="글자 크기 조절">
            <Accessibility size={20} />
            <button onClick={() => setFontScale(0.95)} className={fontScale === 0.95 ? "active" : ""}>가</button>
            <button onClick={() => setFontScale(1)} className={fontScale === 1 ? "active" : ""}>가</button>
            <button onClick={() => setFontScale(1.12)} className={fontScale === 1.12 ? "active" : ""}>가</button>
          </div>
        </div>
      </header>

      <main className="pilgrim-portal-page">
        <header className="pilgrim-portal-heading">
          <span>Pilgrim &amp; Host Access</span>
          <h2>순례자 카드 확인</h2>
          <p>순례자는 본인의 개인 카드를 열고, 홈스테이 호스트는 배정된 순례자의 식단 정보를 확인합니다.</p>
        </header>

        <div className="pilgrim-portal-tabs" role="tablist" aria-label="순례자 확인 유형">
          <button type="button" role="tab" aria-selected={mode === "pilgrim"} className={mode === "pilgrim" ? "active" : ""} onClick={() => setMode("pilgrim")}><IdCard /> 순례자 로그인</button>
          <button type="button" role="tab" aria-selected={mode === "host"} className={mode === "host" ? "active" : ""} onClick={() => setMode("host")}><ShieldCheck /> 호스트 로그인</button>
        </div>

        {mode === "pilgrim" ? (
          <section className="pilgrim-portal-access" aria-labelledby="pilgrim-access-title">
            <div className="pilgrim-portal-copy">
              <span>FOR PILGRIMS</span>
              <h3 id="pilgrim-access-title">내 순례자 카드 열기</h3>
              <p>관리자가 이메일이나 SMS로 보낸 개인 카드 링크를 누르면 바로 열립니다. 아래에는 링크 전체 또는 바코드의 접속 코드를 입력할 수 있습니다.</p>
              <dl>
                <div><dt><UserRound /> 카드 표시 정보</dt><dd>순례자 번호, 성명, 세례명, 바코드와 식단 안내</dd></div>
                <div><dt><KeyRound /> 안전한 접속</dt><dd>개인별 비밀 코드와 만료 기한을 적용하며 이름만으로는 조회할 수 없습니다.</dd></div>
              </dl>
            </div>
            <form className="pilgrim-portal-form" onSubmit={openCard}>
              <label>개인 카드 링크 또는 접속 코드
                <input required autoComplete="off" value={cardAccess} onChange={(event) => setCardAccess(event.target.value)} placeholder="https://.../pilgrim/card#접속코드" />
              </label>
              {pilgrimMessage && <p className="error" role="alert">{pilgrimMessage}</p>}
              <button type="submit" className="primary" disabled={pilgrimBusy || !cardAccess.trim()}><LogIn size={18} /> {pilgrimBusy ? "카드 확인 중" : "내 순례자 카드 열기"}</button>
            </form>
          </section>
        ) : !hostToken || !hostApplication ? (
          <section className="pilgrim-portal-access" aria-labelledby="host-access-title">
            <div className="pilgrim-portal-copy">
              <span>FOR HOST FAMILIES</span>
              <h3 id="host-access-title">홈스테이 호스트 로그인</h3>
              <p>홈스테이 접수 시 입력한 대표자 정보로 인증합니다. 승인 완료 후 우리 가정에 배정된 순례자만 확인할 수 있습니다.</p>
              <dl>
                <div><dt><ShieldCheck /> 접수 인증</dt><dd>대표자 성명, 연락처, 접수 확인용 비밀번호 4자리</dd></div>
                <div><dt><IdCard /> 배정 확인</dt><dd>순례자 바코드를 촬영해 식단과 알레르기 주의사항 확인</dd></div>
              </dl>
            </div>
            <form className="pilgrim-portal-form" onSubmit={loginHost}>
              <label>호스트 대표자 성명<input required autoComplete="name" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="홍길동" /></label>
              <label>연락처<input required type="tel" inputMode="tel" autoComplete="tel" value={hostPhone} onChange={(event) => setHostPhone(formatKoreanPhoneNumber(event.target.value))} placeholder="010-0000-0000" /></label>
              <label>접수 확인 비밀번호 4자리<input required type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} pattern="\d{4}" value={hostPin} onChange={(event) => setHostPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="숫자 4자리" /></label>
              {hostMessage && <p className="error" role="alert">{hostMessage}</p>}
              <button type="submit" className="primary" disabled={hostBusy || !hostName.trim() || hostPhone.replace(/\D/g, "").length < 10 || hostPin.length !== 4}><LogIn size={18} /> {hostBusy ? "인증 중" : "호스트 로그인"}</button>
            </form>
          </section>
        ) : (
          <section className="pilgrim-host-workspace">
            <div className={hostConfirmed ? "host-session-banner confirmed" : "host-session-banner pending"}>
              {hostConfirmed ? <CheckCircle2 /> : <Clock3 />}
              <div><strong>{hostApplication.representative.name} 호스트님</strong><p>{hostConfirmed ? "승인된 호스트 접수로 로그인했습니다." : "현재 호스트 접수가 승인 대기 중입니다."}</p></div>
              <button type="button" className="secondary" onClick={onHostLogout}><LogOut size={17} /> 로그아웃</button>
            </div>
            {hostConfirmed ? <HostPilgrimScanner token={hostToken} onAuthenticate={() => undefined} embedded /> : <div className="panel host-approval-wait"><Clock3 /><h3>승인 완료 후 이용할 수 있습니다.</h3><p>홈스테이 접수 승인 상태는 운영자 검토 후 변경됩니다.</p></div>}
          </section>
        )}
      </main>
      <AppFooter navigate={navigate} />
    </div>
  );
}
