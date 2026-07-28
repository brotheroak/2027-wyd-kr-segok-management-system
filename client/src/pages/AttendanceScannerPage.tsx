import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  KeyRound,
  LocateFixed,
  LogOut,
  MapPin,
  RefreshCw,
  ScanBarcode,
  ShieldCheck
} from "lucide-react";
import { api } from "../api.js";
import type { AdminRole, AttendanceCheckpoint, PilgrimAttendanceRecord } from "../types.js";

type LoginResponse = {
  token: string;
  role: AdminRole;
} | {
  mfaRequired: true;
  mfaEnabled?: boolean;
  mfaSecret?: string;
};

const ADMIN_TOKEN_KEY = "wydAdminToken";
const ADMIN_ROLE_KEY = "wydAdminRole";

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return "카메라 권한이 차단되었습니다. 사이트 설정에서 카메라를 허용해 주세요.";
  if (name === "NotFoundError") return "사용 가능한 카메라를 찾을 수 없습니다.";
  if (name === "NotReadableError") return "다른 앱이 카메라를 사용 중입니다.";
  if (name === "SecurityError") return "카메라는 HTTPS 또는 localhost에서만 사용할 수 있습니다.";
  return "카메라를 시작하지 못했습니다. 카메라 권한과 HTTPS 접속 여부를 확인해 주세요.";
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return Boolean(error && typeof error === "object" && "code" in error && "message" in error);
}

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "위치 권한이 차단되었습니다. 사이트 설정에서 위치 권한을 허용해 주세요.";
  if (error.code === error.POSITION_UNAVAILABLE) return "현재 위치를 확인할 수 없습니다. GPS와 위치 서비스를 켜 주세요.";
  if (error.code === error.TIMEOUT) return "위치 확인 시간이 초과되었습니다. 개방된 장소에서 다시 시도해 주세요.";
  return "현재 위치를 확인하지 못했습니다.";
}

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      reject(new Error("위치 확인은 HTTPS 또는 localhost에서만 사용할 수 있습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0
    });
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function AttendanceScannerPage() {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [checkpoints, setCheckpoints] = useState<AttendanceCheckpoint[]>([]);
  const [checkpointId, setCheckpointId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);
  const [lastRecord, setLastRecord] = useState<PilgrimAttendanceRecord | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanHandlerRef = useRef<(value: string) => void>(() => undefined);
  const scanLockRef = useRef(false);

  const clearSession = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_ROLE_KEY);
    setToken(null);
    setCheckpoints([]);
    setCheckpointId("");
    setCameraOpen(false);
  };

  const loadCheckpoints = async (activeToken: string) => {
    const response = await api<{ checkpoints: AttendanceCheckpoint[] }>("/api/attendance/checkpoints", {}, activeToken);
    setCheckpoints(response.checkpoints);
    setCheckpointId((current) => response.checkpoints.some((item) => item.id === current)
      ? current
      : response.checkpoints[0]?.id ?? "");
  };

  useEffect(() => {
    if (!token) return;
    api("/api/admin/session", {}, token)
      .then(() => loadCheckpoints(token))
      .catch(() => clearSession());
  }, [token]);

  const completeLogin = async (response: Extract<LoginResponse, { token: string }>) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, response.token);
    sessionStorage.setItem(ADMIN_ROLE_KEY, response.role);
    setToken(response.token);
    setPassword("");
    setOtpCode("");
    setMfaRequired(false);
    setMessageTone("success");
    setMessage("현장 출석 확인 화면에 로그인했습니다.");
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await api<LoginResponse>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if ("token" in response) {
        await completeLogin(response);
      } else {
        setMfaRequired(true);
        setMfaSecret(response.mfaSecret ?? "");
      }
    } catch (error) {
      setMessageTone("error");
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api<Extract<LoginResponse, { token: string }>>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password, code: otpCode })
      });
      await completeLogin(response);
    } catch (error) {
      setMessageTone("error");
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (token) {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }
    clearSession();
    setMessage("");
  };

  const checkBarcode = async (value: string) => {
    const cardValue = value.trim();
    if (!token) return;
    if (!checkpointId) {
      setMessageTone("error");
      setMessage("먼저 출석을 확인할 체크 지점을 선택해 주세요.");
      return;
    }
    if (!cardValue || scanLockRef.current) return;
    scanLockRef.current = true;
    setBusy(true);
    setMessageTone("info");
    setMessage("기기 위치와 체크 지점을 대조하고 있습니다.");
    try {
      const position = await currentPosition();
      const response = await api<{ record: PilgrimAttendanceRecord; duplicate: boolean }>("/api/attendance/check", {
        method: "POST",
        body: JSON.stringify({
          checkpointId,
          cardValue,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      }, token);
      setLastRecord(response.record);
      setScanValue("");
      setCameraOpen(false);
      setMessageTone("success");
      setMessage(response.duplicate
        ? "2분 이내에 이미 확인된 순례자입니다. 기존 기록을 표시합니다."
        : `${response.record.pilgrim.name} 순례자의 출석을 저장했습니다.`);
    } catch (error) {
      if ((error as Error).message === "인증이 필요합니다.") clearSession();
      setMessageTone("error");
      setMessage(isGeolocationError(error) ? geolocationErrorMessage(error) : (error as Error).message);
    } finally {
      setBusy(false);
      window.setTimeout(() => { scanLockRef.current = false; }, 1_000);
    }
  };
  scanHandlerRef.current = (value) => { void checkBarcode(value); };

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
        permissionStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } }
        });
        permissionStream.getTracks().forEach((track) => track.stop());
        permissionStream = undefined;
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!active || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const preferred = devices.find((device) => /back|rear|environment|후면/i.test(device.label)) ?? devices[0];
        controls = await reader.decodeFromVideoDevice(preferred?.deviceId, videoRef.current, (result) => {
          if (result) scanHandlerRef.current(result.getText());
        });
        if (active) setCameraStatus("순례자 카드의 바코드를 화면 중앙에 맞춰 주세요.");
      } catch (error) {
        if (active) setCameraStatus(cameraErrorMessage(error));
      }
    })();

    return () => {
      active = false;
      permissionStream?.getTracks().forEach((track) => track.stop());
      controls?.stop();
    };
  }, [cameraOpen]);

  if (!token) {
    return (
      <main className="attendance-field-page attendance-login-page">
        <section className="attendance-field-intro">
          <span>FIELD CHECK-IN</span>
          <h2>순례자 출석 스캔</h2>
          <p>현장 운영자가 순례자 카드 바코드를 확인하는 전용 화면입니다.</p>
          <div><ShieldCheck /><span>승인된 운영자 계정으로 로그인해야 출석을 기록할 수 있습니다.</span></div>
        </section>
        <section className="attendance-login-panel">
          <div className="attendance-panel-title">
            <KeyRound />
            <div><h2>{mfaRequired ? "OTP 인증" : "현장 운영자 로그인"}</h2><p>운영자 콘솔에 들어가지 않고 바로 출석 업무를 시작합니다.</p></div>
          </div>
          {!mfaRequired ? (
            <form onSubmit={login}>
              <label className="attendance-field"><span>운영자 이메일</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
              <label className="attendance-field"><span>비밀번호</span><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
              <button className="primary" type="submit" disabled={busy}>로그인</button>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              {mfaSecret && <div className="attendance-mfa-secret"><strong>최초 OTP 등록 키</strong><code>{mfaSecret}</code></div>}
              <label className="attendance-field"><span>OTP 인증번호 6자리</span><input inputMode="numeric" pattern="\d{6}" maxLength={6} required value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
              <div className="attendance-actions">
                <button type="button" className="secondary" onClick={() => { setMfaRequired(false); setOtpCode(""); }}>취소</button>
                <button className="primary" type="submit" disabled={busy || otpCode.length !== 6}>인증 및 시작</button>
              </div>
            </form>
          )}
          {message && <div className={`attendance-notice ${messageTone}`} role="status"><AlertTriangle /><span>{message}</span></div>}
        </section>
      </main>
    );
  }

  const activeCheckpoint = checkpoints.find((item) => item.id === checkpointId);
  return (
    <main className="attendance-field-page">
      <section className="attendance-field-toolbar">
        <div>
          <span>FIELD CHECK-IN</span>
          <h2><ScanBarcode /> 순례자 출석 스캔</h2>
          <p>바코드를 인식하는 순간 기기의 현재 위치를 체크 지점과 대조합니다.</p>
        </div>
        <div>
          <button type="button" className="secondary" onClick={() => token && loadCheckpoints(token)}><RefreshCw /> 지점 새로고침</button>
          <button type="button" className="secondary" onClick={logout}><LogOut /> 로그아웃</button>
        </div>
      </section>

      {message && <div className={`attendance-notice ${messageTone}`} role="status" aria-live="polite">
        {messageTone === "success" ? <CheckCircle2 /> : messageTone === "error" ? <AlertTriangle /> : <LocateFixed />}
        <span>{message}</span>
      </div>}

      <section className="attendance-field-workspace">
        <div className="attendance-panel attendance-field-scanner">
          <label className="attendance-field">
            <span>현재 체크 지점 <b>*</b></span>
            <select value={checkpointId} onChange={(event) => setCheckpointId(event.target.value)}>
              <option value="">체크 지점 선택</option>
              {checkpoints.map((checkpoint) => (
                <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.name} · 허용 반경 {checkpoint.radiusM}m</option>
              ))}
            </select>
          </label>
          {activeCheckpoint && <div className="attendance-selected-location"><MapPin /><div><strong>{activeCheckpoint.name}</strong><span>{activeCheckpoint.address} {activeCheckpoint.addressDetail}</span></div></div>}
          {checkpoints.length === 0 && <div className="attendance-notice error"><AlertTriangle /><span>활성 체크 지점이 없습니다. 개인정보 관리자가 운영자 콘솔에서 먼저 등록해야 합니다.</span></div>}
          <form className="attendance-scan-form" onSubmit={(event) => { event.preventDefault(); void checkBarcode(scanValue); }}>
            <label className="attendance-field">
              <span>바코드 값 또는 순례자 ID</span>
              <input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="PLG-... 또는 카드 바코드" autoComplete="off" autoFocus />
            </label>
            <div className="attendance-actions">
              <button type="submit" className="primary" disabled={busy || !checkpointId}><ScanBarcode /> {busy ? "위치 확인 중" : "출석 확인"}</button>
              <button type="button" className="secondary" disabled={!checkpointId} onClick={() => setCameraOpen((open) => !open)}><Camera /> {cameraOpen ? "카메라 닫기" : "카메라 스캔"}</button>
            </div>
          </form>
          {cameraOpen && <div className="attendance-camera"><video ref={videoRef} muted playsInline /><p>{cameraStatus}</p></div>}
        </div>

        <aside className={`attendance-field-result ${lastRecord ? "has-result" : ""}`}>
          {lastRecord ? (
            <>
              <CheckCircle2 />
              <span>CHECK-IN COMPLETE</span>
              <h3>{lastRecord.pilgrim.name}</h3>
              <p>{lastRecord.pilgrim.baptismalName || "세례명 없음"} · {lastRecord.pilgrim.pilgrimNo}</p>
              <dl>
                <div><dt>확인 위치</dt><dd>{lastRecord.checkpoint.name}</dd></div>
                <div><dt>지점과 거리</dt><dd>{Math.round(lastRecord.distanceM)}m</dd></div>
                <div><dt>확인 시각</dt><dd>{formatDateTime(lastRecord.checkedAt)}</dd></div>
              </dl>
            </>
          ) : (
            <>
              <ScanBarcode />
              <h3>스캔 대기 중</h3>
              <p>순례자 카드가 확인되면 이곳에 결과가 크게 표시됩니다.</p>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
