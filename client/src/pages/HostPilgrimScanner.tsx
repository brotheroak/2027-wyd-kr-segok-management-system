import React, { useEffect, useRef, useState } from "react";
import { Camera, CircleAlert, Languages, Salad, ScanBarcode, Search, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api.js";
import { pilgrimCardLabels, pilgrimLanguageOptions, pilgrimPortalLabels, type PilgrimCardLanguage, type PublicPilgrimCard } from "../utils/pilgrimCardI18n.js";

function cameraErrorMessage(error: unknown, language: PilgrimCardLanguage) {
  const labels = pilgrimPortalLabels[language];
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return labels.cameraDenied;
  if (name === "NotFoundError") return labels.cameraMissing;
  if (name === "NotReadableError") return labels.cameraBusy;
  return labels.cameraUnavailable;
}

type HostPilgrimScannerProps = {
  token?: string;
  onAuthenticate: () => void;
  embedded?: boolean;
  language?: PilgrimCardLanguage;
  onLanguageChange?: (language: PilgrimCardLanguage) => void;
};

export function HostPilgrimScanner({ token, onAuthenticate, embedded = false, language: controlledLanguage, onLanguageChange }: HostPilgrimScannerProps) {
  const [cardValue, setCardValue] = useState("");
  const [internalLanguage, setInternalLanguage] = useState<PilgrimCardLanguage>("ko");
  const language = controlledLanguage ?? internalLanguage;
  const setLanguage = (value: PilgrimCardLanguage) => {
    setInternalLanguage(value);
    onLanguageChange?.(value);
  };
  const [pilgrim, setPilgrim] = useState<PublicPilgrimCard | null>(null);
  const [message, setMessage] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolveCard = async (value = cardValue) => {
    if (!token) return onAuthenticate();
    setMessage("");
    try {
      const data = await api<{ pilgrim: PublicPilgrimCard }>("/api/host/pilgrims/resolve", { method: "POST", body: JSON.stringify({ cardValue: value, language }) }, token);
      setPilgrim(data.pilgrim);
      setCameraOpen(false);
    } catch (error) {
      setPilgrim(null);
      setMessage(language === "ko" ? (error as Error).message : pilgrimPortalLabels[language].scanError);
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    let active = true;
    let controls: { stop: () => void } | undefined;
    let permissionStream: MediaStream | undefined;
    setCameraStatus(pilgrimPortalLabels[language].cameraRequest);
    void (async () => {
      try {
        if (!window.isSecureContext) throw new DOMException("Secure context required", "SecurityError");
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Camera unavailable", "NotFoundError");
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
        permissionStream.getTracks().forEach((track) => track.stop());
        permissionStream = undefined;
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active || !videoRef.current) return;
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const preferred = devices.find((device) => /back|rear|environment|후면/i.test(device.label)) ?? devices[0];
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(preferred?.deviceId, videoRef.current, (result) => {
          if (!result) return;
          const value = result.getText();
          setCardValue(value);
          void resolveCard(value);
        });
        if (active) setCameraStatus(pilgrimPortalLabels[language].cameraAim);
      } catch (error) {
        if (active) setCameraStatus(cameraErrorMessage(error, language));
      }
    })();
    return () => { active = false; permissionStream?.getTracks().forEach((track) => track.stop()); controls?.stop(); };
  }, [cameraOpen, token, language]);

  const labels = pilgrimCardLabels[language];
  const portalLabels = pilgrimPortalLabels[language];
  return (
    <section className="single host-pilgrim-page">
      {!embedded && <div className="page-heading"><span>Host Pilgrim Check</span><h2>{labels.hostTitle}</h2><p>{portalLabels.assignedCheckText}</p></div>}
      {!token ? <div className="panel host-auth-required"><ShieldCheck /><h3>{portalLabels.hostTitle}</h3><p>{portalLabels.hostIntro}</p><button className="primary" onClick={onAuthenticate}>{portalLabels.receiptAuth}</button></div> : (
        <>
          <div className="panel host-scanner-panel">
            <label className="host-language-select"><Languages /><span>{portalLabels.displayLanguage}</span><select value={language} onChange={(event) => { setLanguage(event.target.value as PilgrimCardLanguage); setPilgrim(null); }}>{pilgrimLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <div className="scanner-strip"><label><ScanBarcode /><input value={cardValue} onChange={(event) => setCardValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void resolveCard()} placeholder={labels.manual} /></label><button className="primary" onClick={() => void resolveCard()}><Search size={18} /> {labels.lookup}</button><button className="secondary" onClick={() => { setMessage(""); setCameraOpen(!cameraOpen); }}><Camera size={18} /> {labels.camera}</button></div>
            {cameraOpen && <div className="camera-reader"><video ref={videoRef} muted playsInline /><p className="camera-status">{cameraStatus}</p><button className="modal-close-button" onClick={() => setCameraOpen(false)}>{portalLabels.close}</button></div>}
            {message && <p className="host-scan-error"><CircleAlert /> {message}</p>}
          </div>
          {pilgrim && <article className="panel host-pilgrim-card"><header><UserRound /><div><span>{pilgrim.pilgrimNo}</span><h3>{pilgrim.name}{pilgrim.baptismalName ? ` (${pilgrim.baptismalName})` : ""}</h3><p>{pilgrim.diocese} · {pilgrim.region} · {pilgrim.grade}</p></div></header><section className="pilgrim-diet-card"><h3><Salad /> {labels.diet}: {pilgrim.dietGuide.label}</h3><div className="diet-guide-grid"><div className="can-eat"><span>{labels.canEat}</span><p>{pilgrim.dietGuide.canEat}</p></div><div className="must-avoid"><span>{labels.avoid}</span><p>{pilgrim.dietGuide.avoid}</p></div><div><span>{labels.koreanFood}</span><p>{pilgrim.dietGuide.koreanFood}</p></div><div><span>{labels.dietNotes}</span><p>{pilgrim.dietNotes || labels.none}</p></div><div><span>{labels.allergies}</span><p>{pilgrim.allergies || labels.none}</p></div></div></section></article>}
        </>
      )}
    </section>
  );
}
