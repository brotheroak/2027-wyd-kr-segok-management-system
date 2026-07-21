import React, { useEffect, useRef, useState } from "react";
import { Camera, CircleAlert, Languages, Salad, ScanBarcode, Search, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api.js";
import { pilgrimCardLabels, pilgrimLanguageOptions, type PilgrimCardLanguage, type PublicPilgrimCard } from "../utils/pilgrimCardI18n.js";

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return "카메라 권한이 차단되었습니다. 주소창의 사이트 설정에서 카메라를 허용해 주세요.";
  if (name === "NotFoundError") return "사용 가능한 카메라를 찾을 수 없습니다.";
  if (name === "NotReadableError") return "다른 앱이 카메라를 사용 중입니다.";
  return "카메라를 시작하지 못했습니다. HTTPS 접속과 브라우저 권한을 확인해 주세요.";
}

export function HostPilgrimScanner({ token, onAuthenticate }: { token?: string; onAuthenticate: () => void }) {
  const [cardValue, setCardValue] = useState("");
  const [language, setLanguage] = useState<PilgrimCardLanguage>("ko");
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
      setMessage((error as Error).message);
    }
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    let active = true;
    let controls: { stop: () => void } | undefined;
    let permissionStream: MediaStream | undefined;
    setCameraStatus("카메라 권한을 요청하는 중입니다.");
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
        if (active) setCameraStatus("순례자 바코드를 화면 중앙에 맞춰 주세요.");
      } catch (error) {
        if (active) setCameraStatus(cameraErrorMessage(error));
      }
    })();
    return () => { active = false; permissionStream?.getTracks().forEach((track) => track.stop()); controls?.stop(); };
  }, [cameraOpen, token, language]);

  const labels = pilgrimCardLabels[language];
  return (
    <section className="single host-pilgrim-page">
      <div className="page-heading"><span>Host Pilgrim Check</span><h2>배정 순례자 카드 확인</h2><p>순례자의 카드 바코드를 촬영하면 우리 가정에 배정된 순례자의 등록 정보와 식단 주의사항을 확인할 수 있습니다.</p></div>
      {!token ? <div className="panel host-auth-required"><ShieldCheck /><h3>호스트 인증이 필요합니다.</h3><p>홈스테이 접수 내역을 조회한 뒤 배정 순례자 카드를 확인할 수 있습니다.</p><button className="primary" onClick={onAuthenticate}>호스트 접수 인증</button></div> : (
        <>
          <div className="panel host-scanner-panel">
            <label className="host-language-select"><Languages /><span>표시 언어</span><select value={language} onChange={(event) => { setLanguage(event.target.value as PilgrimCardLanguage); setPilgrim(null); }}>{pilgrimLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <div className="scanner-strip"><label><ScanBarcode /><input value={cardValue} onChange={(event) => setCardValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void resolveCard()} placeholder={labels.manual} /></label><button className="primary" onClick={() => void resolveCard()}><Search size={18} /> {labels.lookup}</button><button className="secondary" onClick={() => { setMessage(""); setCameraOpen(!cameraOpen); }}><Camera size={18} /> {labels.camera}</button></div>
            {cameraOpen && <div className="camera-reader"><video ref={videoRef} muted playsInline /><p className="camera-status">{cameraStatus}</p><button className="modal-close-button" onClick={() => setCameraOpen(false)}>닫기</button></div>}
            {message && <p className="host-scan-error"><CircleAlert /> {message}</p>}
          </div>
          {pilgrim && <article className="panel host-pilgrim-card"><header><UserRound /><div><span>{pilgrim.pilgrimNo}</span><h3>{pilgrim.name}{pilgrim.baptismalName ? ` (${pilgrim.baptismalName})` : ""}</h3><p>{pilgrim.diocese} · {pilgrim.region} · {pilgrim.grade}</p></div></header><section className="pilgrim-diet-card"><h3><Salad /> {labels.diet}: {pilgrim.dietGuide.label}</h3><div className="diet-guide-grid"><div className="can-eat"><span>{labels.canEat}</span><p>{pilgrim.dietGuide.canEat}</p></div><div className="must-avoid"><span>{labels.avoid}</span><p>{pilgrim.dietGuide.avoid}</p></div><div><span>{labels.koreanFood}</span><p>{pilgrim.dietGuide.koreanFood}</p></div><div><span>{labels.dietNotes}</span><p>{pilgrim.dietNotes || labels.none}</p></div><div><span>{labels.allergies}</span><p>{pilgrim.allergies || labels.none}</p></div></div></section></article>}
        </>
      )}
    </section>
  );
}
