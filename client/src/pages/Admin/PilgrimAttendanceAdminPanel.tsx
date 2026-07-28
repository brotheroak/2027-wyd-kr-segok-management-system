import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  LocateFixed,
  MapPin,
  MapPinned,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { api } from "../../api.js";
import { GoogleCheckpointMap } from "../../components/GoogleCheckpointMap.js";
import type { AttendanceCheckpoint, PilgrimAttendanceRecord } from "../../types.js";
import { geocodeGoogleAddress, reverseGeocodeGoogleLocation } from "../../utils/googleMaps.js";
import { openKakaoPostcode } from "../../utils/postcode.js";

type AttendanceTab = "checkpoints" | "history";
type CheckpointForm = Omit<AttendanceCheckpoint, "id" | "createdAt" | "updatedAt">;
type AttendanceData = {
  checkpoints: AttendanceCheckpoint[];
  records: PilgrimAttendanceRecord[];
  currentLocations: PilgrimAttendanceRecord[];
};

const emptyCheckpoint = (): CheckpointForm => ({
  name: "",
  postcode: "",
  address: "",
  addressDetail: "",
  latitude: Number.NaN,
  longitude: Number.NaN,
  radiusM: 100,
  active: true
});

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
      reject(new Error("현재 위치 지정은 HTTPS 또는 localhost에서만 사용할 수 있습니다."));
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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function PilgrimAttendanceAdminPanel({
  token,
  canViewPersonalData
}: {
  token: string;
  canViewPersonalData: boolean;
}) {
  const [tab, setTab] = useState<AttendanceTab>("checkpoints");
  const [data, setData] = useState<AttendanceData>({ checkpoints: [], records: [], currentLocations: [] });
  const [form, setForm] = useState<CheckpointForm>(emptyCheckpoint());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [checkpointFilter, setCheckpointFilter] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);

  const load = async (nextQuery = query, nextCheckpoint = checkpointFilter) => {
    const response = await api<AttendanceData>(
      `/api/admin/attendance?q=${encodeURIComponent(nextQuery)}&checkpointId=${encodeURIComponent(nextCheckpoint)}`,
      {},
      token
    );
    setData(response);
  };

  useEffect(() => {
    if (!canViewPersonalData) return;
    load("", "").catch((error) => {
      setMessageTone("error");
      setMessage((error as Error).message);
    });
  }, [token, canViewPersonalData]);

  if (!canViewPersonalData) {
    return (
      <section className="admin-feature-panel locked-feature">
        <ShieldCheck />
        <h2>체크 지점과 순례자 위치 이력은 개인정보 관리자만 볼 수 있습니다.</h2>
        <p>일반 운영자는 별도 현장 출석 화면에서 승인된 체크 지점의 바코드 스캔만 할 수 있습니다.</p>
        <a className="primary" href="/attendance">현장 출석 화면 열기</a>
      </section>
    );
  }

  const locateAddress = async (address = form.address) => {
    if (!address.trim()) {
      setMessageTone("error");
      setMessage("먼저 주소를 입력하거나 검색해 주세요.");
      return;
    }
    setBusy(true);
    setMessageTone("info");
    setMessage("Google 지도에서 주소 좌표를 찾고 있습니다.");
    try {
      const result = await geocodeGoogleAddress(address);
      setForm((current) => ({
        ...current,
        address,
        latitude: result.latitude,
        longitude: result.longitude
      }));
      setMessageTone("success");
      setMessage("주소 기준 위도·경도를 지정했습니다. 지도에서 핀 위치를 확인해 주세요.");
    } catch (error) {
      setMessageTone("error");
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const searchAddress = () => {
    void openKakaoPostcode({
      fallbackAddress: form.address,
      detailInputId: "attendance-address-detail",
      onComplete: (postcode, address) => {
        setForm((current) => ({
          ...current,
          postcode,
          address,
          latitude: Number.NaN,
          longitude: Number.NaN
        }));
        void locateAddress(address);
      }
    });
  };

  const captureCheckpointLocation = async () => {
    setBusy(true);
    setMessageTone("info");
    setMessage("현재 기기의 위치를 확인하고 있습니다.");
    try {
      const position = await currentPosition();
      if (position.coords.accuracy > 200) {
        throw new Error(`위치 오차가 ${Math.round(position.coords.accuracy)}m입니다. 오차 200m 이내에서 다시 시도해 주세요.`);
      }
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      let address = form.address;
      if (!address) {
        try {
          address = await reverseGeocodeGoogleLocation(latitude, longitude);
        } catch {
          // 좌표 지정은 주소 역검색 실패와 관계없이 완료한다.
        }
      }
      setForm((current) => ({ ...current, address: address || current.address, latitude, longitude }));
      setMessageTone("success");
      setMessage(`현재 위치로 좌표를 지정했습니다. GPS 오차는 약 ${Math.round(position.coords.accuracy)}m입니다.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(isGeolocationError(error) ? geolocationErrorMessage(error) : (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveCheckpoint = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) {
      setMessageTone("error");
      setMessage("주소 검색, 현재 위치 또는 지도에서 체크 지점 좌표를 지정해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await api(editingId ? `/api/admin/attendance/checkpoints/${editingId}` : "/api/admin/attendance/checkpoints", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      }, token);
      setForm(emptyCheckpoint());
      setEditingId(null);
      setMessageTone("success");
      setMessage("체크 지점을 저장했습니다.");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editCheckpoint = (checkpoint: AttendanceCheckpoint) => {
    setEditingId(checkpoint.id);
    setForm({
      name: checkpoint.name,
      postcode: checkpoint.postcode,
      address: checkpoint.address,
      addressDetail: checkpoint.addressDetail,
      latitude: checkpoint.latitude,
      longitude: checkpoint.longitude,
      radiusM: checkpoint.radiusM,
      active: checkpoint.active
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deactivateCheckpoint = async (checkpoint: AttendanceCheckpoint) => {
    if (!window.confirm(`${checkpoint.name} 체크 지점을 사용 중지하시겠습니까?\n기존 출석 이력은 보존됩니다.`)) return;
    try {
      await api(`/api/admin/attendance/checkpoints/${checkpoint.id}`, { method: "DELETE" }, token);
      setMessageTone("success");
      setMessage("체크 지점을 사용 중지했습니다.");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage((error as Error).message);
    }
  };

  const searchHistory = async (event: React.FormEvent) => {
    event.preventDefault();
    await load(query, checkpointFilter);
  };

  return (
    <section className="attendance-admin">
      <div className="attendance-heading">
        <div>
          <span className="eyebrow">LOCATION MANAGEMENT</span>
          <h1><MapPinned /> 체크 지점·위치 이력</h1>
          <p>현장 출석 스캔은 별도 화면에서 진행하고, 여기서는 지점과 순례자 위치 이력을 관리합니다.</p>
        </div>
        <div className="attendance-heading-actions">
          <a className="primary" href="/attendance">현장 출석 화면</a>
          <button type="button" className="secondary" onClick={() => load()}><RefreshCw size={17} /> 새로고침</button>
        </div>
      </div>

      <nav className="attendance-tabs attendance-tabs-two" aria-label="출석 위치 관리 화면">
        <button type="button" className={tab === "checkpoints" ? "active" : ""} onClick={() => setTab("checkpoints")}><MapPin /> 체크 지점 관리</button>
        <button type="button" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History /> 현재 위치·이력</button>
      </nav>

      {message && (
        <div className={`attendance-notice ${messageTone}`} role="status" aria-live="polite">
          {messageTone === "success" ? <CheckCircle2 /> : messageTone === "error" ? <AlertTriangle /> : <LocateFixed />}
          <span>{message}</span>
        </div>
      )}

      {tab === "checkpoints" && (
        <div className="attendance-checkpoint-layout">
          <form className="attendance-panel attendance-checkpoint-form" onSubmit={saveCheckpoint}>
            <div className="attendance-panel-title"><MapPin /><div><h2>{editingId ? "체크 지점 수정" : "체크 지점 등록"}</h2><p>주소 검색 후 좌표가 자동 지정되며 지도에서 보정할 수 있습니다.</p></div></div>
            <label className="attendance-field"><span>위치 이름 <b>*</b></span><input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="예: 세곡동성당 정문" /></label>
            <div className="attendance-address-row">
              <label className="attendance-field"><span>우편번호</span><input value={form.postcode} readOnly placeholder="주소 검색" /></label>
              <button type="button" className="secondary" onClick={searchAddress}><Search /> 주소 검색</button>
            </div>
            <label className="attendance-field"><span>기본 주소 <b>*</b></span><input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value, latitude: Number.NaN, longitude: Number.NaN })} /></label>
            <label className="attendance-field"><span>상세 주소</span><input id="attendance-address-detail" value={form.addressDetail} onChange={(event) => setForm({ ...form, addressDetail: event.target.value })} /></label>
            <div className="attendance-coordinate-tools">
              <button type="button" className="secondary" disabled={busy || !form.address.trim()} onClick={() => void locateAddress()}><MapPinned /> 주소 좌표 다시 찾기</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => void captureCheckpointLocation()}><LocateFixed /> 현재 위치로 지정</button>
            </div>
            <div className={`attendance-coordinate ${Number.isFinite(form.latitude) ? "ready" : ""}`}>
              <div><LocateFixed /><span>{Number.isFinite(form.latitude) ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}` : "주소 검색, 현재 위치 또는 지도에서 좌표를 지정해 주세요."}</span></div>
            </div>
            <GoogleCheckpointMap
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude }))}
            />
            <label className="attendance-field">
              <span>허용 반경 <b>{form.radiusM}m</b></span>
              <input type="range" min={20} max={1000} step={10} value={form.radiusM} onChange={(event) => setForm({ ...form, radiusM: Number(event.target.value) })} />
            </label>
            <label className={`attendance-active-check ${form.active ? "selected" : ""}`}>
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              <span>현장 출석 화면에서 사용하는 활성 지점</span>
            </label>
            <div className="attendance-actions">
              <button type="submit" className="primary" disabled={busy || !Number.isFinite(form.latitude)}><Save /> {editingId ? "수정 저장" : "지점 저장"}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyCheckpoint()); }}>취소</button>}
            </div>
          </form>

          <div className="attendance-panel">
            <div className="attendance-panel-title"><MapPinned /><div><h2>등록된 체크 지점</h2><p>사용 중지해도 기존 출석 이력은 보존됩니다.</p></div></div>
            <div className="checkpoint-list">
              {data.checkpoints.map((checkpoint) => (
                <article key={checkpoint.id} className={`checkpoint-item ${checkpoint.active ? "" : "inactive"}`}>
                  <div><strong>{checkpoint.name}</strong><span>{checkpoint.active ? "사용 중" : "사용 중지"}</span></div>
                  <p>{checkpoint.address} {checkpoint.addressDetail}</p>
                  <small>허용 반경 {checkpoint.radiusM}m · {checkpoint.latitude.toFixed(5)}, {checkpoint.longitude.toFixed(5)}</small>
                  <a href={`https://www.google.com/maps?q=${checkpoint.latitude},${checkpoint.longitude}`} target="_blank" rel="noreferrer">Google 지도에서 보기</a>
                  <div className="checkpoint-item-actions">
                    <button type="button" className="secondary" onClick={() => editCheckpoint(checkpoint)}>수정</button>
                    {checkpoint.active && <button type="button" className="danger-button" onClick={() => void deactivateCheckpoint(checkpoint)}><Trash2 /> 사용 중지</button>}
                  </div>
                </article>
              ))}
              {data.checkpoints.length === 0 && <div className="attendance-empty">등록된 체크 지점이 없습니다.</div>}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="attendance-history">
          <div className="attendance-panel">
            <div className="attendance-panel-title"><LocateFixed /><div><h2>현재 확인 위치</h2><p>실시간 추적이 아니라 가장 최근에 바코드가 확인된 체크 지점입니다.</p></div></div>
            <div className="current-location-grid">
              {data.currentLocations.map((record) => (
                <article key={record.pilgrim.id}>
                  <strong>{record.pilgrim.name} <small>{record.pilgrim.baptismalName}</small></strong>
                  <span>{record.pilgrim.pilgrimNo}</span>
                  <b><MapPin /> {record.checkpoint.name}</b>
                  <time>{formatDateTime(record.checkedAt)}</time>
                </article>
              ))}
              {data.currentLocations.length === 0 && <div className="attendance-empty">검색 조건에 맞는 위치 기록이 없습니다.</div>}
            </div>
          </div>

          <div className="attendance-panel">
            <div className="attendance-panel-title"><History /><div><h2>출석·위치 이력</h2><p>최대 1,000건의 최근 확인 기록을 표시합니다.</p></div></div>
            <form className="attendance-filter" onSubmit={searchHistory}>
              <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="성명, 세례명, 순례자 ID, 교구, 지점 통합 검색" /></label>
              <select value={checkpointFilter} onChange={(event) => setCheckpointFilter(event.target.value)}>
                <option value="">전체 체크 지점</option>
                {data.checkpoints.map((checkpoint) => <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.name}</option>)}
              </select>
              <button type="submit" className="primary">조회</button>
            </form>
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead><tr><th>순례자</th><th>체크 지점</th><th>거리 / GPS 오차</th><th>확인 시각</th></tr></thead>
                <tbody>
                  {data.records.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.pilgrim.name}</strong><span>{record.pilgrim.baptismalName || "세례명 없음"} · {record.pilgrim.pilgrimNo}</span></td>
                      <td><strong>{record.checkpoint.name}</strong><span>{record.checkpoint.address}</span></td>
                      <td>{Math.round(record.distanceM)}m / ±{Math.round(record.accuracyM)}m</td>
                      <td>{formatDateTime(record.checkedAt)}</td>
                    </tr>
                  ))}
                  {data.records.length === 0 && <tr><td colSpan={4} className="attendance-empty">출석 이력이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
