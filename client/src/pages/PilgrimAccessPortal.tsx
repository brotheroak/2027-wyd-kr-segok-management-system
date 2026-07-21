import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock3, IdCard, KeyRound, Languages, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api.js";
import type { ApplicationPayload } from "../types.js";
import { formatKoreanPhoneNumber } from "../utils/constants.js";
import { pilgrimLanguageOptions, pilgrimPortalLabels, type PilgrimCardLanguage, type PublicPilgrimCard } from "../utils/pilgrimCardI18n.js";
import { HostPilgrimScanner } from "./HostPilgrimScanner.js";

type AccessMode = "pilgrim" | "host";

type PilgrimAccessPortalProps = {
  initialMode?: AccessMode;
  language: PilgrimCardLanguage;
  setLanguage: (language: PilgrimCardLanguage) => void;
  hostToken?: string;
  hostApplication?: ApplicationPayload | null;
  onHostAuthorized: (token: string, application: ApplicationPayload) => void;
  onHostLogout: () => void;
  onOpenPilgrimCard: (token: string, language: PilgrimCardLanguage) => void;
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
  initialMode = "pilgrim",
  language,
  setLanguage,
  hostToken,
  hostApplication,
  onHostAuthorized,
  onHostLogout,
  onOpenPilgrimCard
}: PilgrimAccessPortalProps) {
  const labels = pilgrimPortalLabels[language];
  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [cardAccess, setCardAccess] = useState("");
  const [pilgrimMessage, setPilgrimMessage] = useState("");
  const [pilgrimBusy, setPilgrimBusy] = useState(false);
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [hostPin, setHostPin] = useState("");
  const [hostMessage, setHostMessage] = useState("");
  const [hostBusy, setHostBusy] = useState(false);

  useEffect(() => setMode(initialMode), [initialMode]);

  const openCard = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = extractCardToken(cardAccess);
    setPilgrimMessage("");
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
      setPilgrimMessage(labels.invalidCard);
      return;
    }
    setPilgrimBusy(true);
    try {
      await api<{ pilgrim: PublicPilgrimCard }>("/api/pilgrims/card", { method: "POST", body: JSON.stringify({ token }) });
      onOpenPilgrimCard(token, language);
    } catch (error) {
      setPilgrimMessage(language === "ko" ? (error as Error).message : labels.cardError);
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
      setHostMessage(language === "ko" ? (error as Error).message : labels.hostLoginError);
    } finally {
      setHostBusy(false);
    }
  };

  const hostConfirmed = hostApplication?.status === "confirmed";

  return (
    <main className="pilgrim-portal-page">
        <header className="pilgrim-portal-heading">
          <label className="pilgrim-portal-language"><Languages /><span>{labels.language}</span><select value={language} onChange={(event) => setLanguage(event.target.value as PilgrimCardLanguage)}>{pilgrimLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <span>{labels.eyebrow}</span>
          <h2>{labels.title}</h2>
          <p>{labels.intro}</p>
        </header>

        <div className="pilgrim-portal-tabs" role="tablist" aria-label={labels.title}>
          <button type="button" role="tab" aria-selected={mode === "pilgrim"} className={mode === "pilgrim" ? "active" : ""} onClick={() => setMode("pilgrim")}><IdCard /> {labels.pilgrimTab}</button>
          <button type="button" role="tab" aria-selected={mode === "host"} className={mode === "host" ? "active" : ""} onClick={() => setMode("host")}><ShieldCheck /> {labels.hostTab}</button>
        </div>

        {mode === "pilgrim" ? (
          <section className="pilgrim-portal-access" aria-labelledby="pilgrim-access-title">
            <div className="pilgrim-portal-copy">
              <span>{labels.pilgrimAudience}</span>
              <h3 id="pilgrim-access-title">{labels.pilgrimTitle}</h3>
              <p>{labels.pilgrimIntro}</p>
              <dl>
                <div><dt><UserRound /> {labels.cardInfo}</dt><dd>{labels.cardInfoText}</dd></div>
                <div><dt><KeyRound /> {labels.secureAccess}</dt><dd>{labels.secureAccessText}</dd></div>
              </dl>
            </div>
            <form className="pilgrim-portal-form" onSubmit={openCard}>
              <label>{labels.cardInput}
                <input required autoComplete="off" value={cardAccess} onChange={(event) => setCardAccess(event.target.value)} placeholder={labels.cardPlaceholder} />
              </label>
              {pilgrimMessage && <p className="error" role="alert">{pilgrimMessage}</p>}
              <button type="submit" className="primary" disabled={pilgrimBusy || !cardAccess.trim()}><LogIn size={18} /> {pilgrimBusy ? labels.cardBusy : labels.openCard}</button>
            </form>
          </section>
        ) : !hostToken || !hostApplication ? (
          <section className="pilgrim-portal-access" aria-labelledby="host-access-title">
            <div className="pilgrim-portal-copy">
              <span>{labels.hostAudience}</span>
              <h3 id="host-access-title">{labels.hostTitle}</h3>
              <p>{labels.hostIntro}</p>
              <dl>
                <div><dt><ShieldCheck /> {labels.receiptAuth}</dt><dd>{labels.receiptAuthText}</dd></div>
                <div><dt><IdCard /> {labels.assignedCheck}</dt><dd>{labels.assignedCheckText}</dd></div>
              </dl>
            </div>
            <form className="pilgrim-portal-form" onSubmit={loginHost}>
              <label>{labels.hostName}<input required autoComplete="name" value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder={labels.hostNamePlaceholder} /></label>
              <label>{labels.phone}<input required type="tel" inputMode="tel" autoComplete="tel" value={hostPhone} onChange={(event) => setHostPhone(formatKoreanPhoneNumber(event.target.value))} placeholder={labels.phonePlaceholder} /></label>
              <label>{labels.pin}<input required type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} pattern="\d{4}" value={hostPin} onChange={(event) => setHostPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={labels.pinPlaceholder} /></label>
              {hostMessage && <p className="error" role="alert">{hostMessage}</p>}
              <button type="submit" className="primary" disabled={hostBusy || !hostName.trim() || hostPhone.replace(/\D/g, "").length < 10 || hostPin.length !== 4}><LogIn size={18} /> {hostBusy ? labels.authBusy : labels.hostLogin}</button>
            </form>
          </section>
        ) : (
          <section className="pilgrim-host-workspace">
            <div className={hostConfirmed ? "host-session-banner confirmed" : "host-session-banner pending"}>
              {hostConfirmed ? <CheckCircle2 /> : <Clock3 />}
              <div><strong>{hostApplication.representative.name} · {labels.hostSuffix}</strong><p>{hostConfirmed ? labels.hostConfirmed : labels.hostPending}</p></div>
              <button type="button" className="secondary" onClick={onHostLogout}><LogOut size={17} /> {labels.logout}</button>
            </div>
            {hostConfirmed ? <HostPilgrimScanner token={hostToken} onAuthenticate={() => undefined} embedded language={language} onLanguageChange={setLanguage} /> : <div className="panel host-approval-wait"><Clock3 /><h3>{labels.approvalTitle}</h3><p>{labels.approvalText}</p></div>}
          </section>
        )}
    </main>
  );
}
