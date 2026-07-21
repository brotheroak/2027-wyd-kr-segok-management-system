import React, { useEffect, useRef, useState } from "react";
import { Camera, Copy, HeartPulse, Link2, Mail, MessageSquare, Printer, ScanBarcode, Search, Send, Trash2, Utensils } from "lucide-react";
import { api } from "../../api.js";
import type { Pilgrim } from "../../types.js";
import { pilgrimLanguageOptions, type PilgrimCardLanguage } from "../../utils/pilgrimCardI18n.js";

type Host = { id: string; applicationNo: string; name: string; address: string; capacity: number };
type PilgrimForm = Omit<Pilgrim, "id" | "host" | "mealLogs" | "createdAt" | "updatedAt" | "cardUrl" | "cardExpiresAt">;

const emptyPilgrim = (): PilgrimForm => ({
  pilgrimNo: "",
  name: "",
  baptismalName: "",
  email: "",
  preferredLanguage: "en",
  gender: "남성",
  diocese: "",
  region: "",
  grade: "",
  age: 18,
  dietType: "일반식",
  dietNotes: "",
  allergies: "",
  healthNotes: "",
  feverStatus: "정상",
  hostApplicationId: ""
});

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return "카메라 권한이 차단되었습니다. 주소창의 사이트 설정에서 카메라를 허용한 뒤 다시 시도해 주세요.";
  if (name === "NotFoundError") return "사용 가능한 카메라를 찾을 수 없습니다.";
  if (name === "NotReadableError") return "다른 앱이 카메라를 사용 중입니다. 해당 앱을 종료한 뒤 다시 시도해 주세요.";
  if (name === "SecurityError") return "보안 설정으로 카메라가 차단되었습니다. HTTPS 주소에서 접속했는지 확인해 주세요.";
  return "카메라를 시작하지 못했습니다. 브라우저의 카메라 권한과 HTTPS 접속 여부를 확인해 주세요.";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

function cardBarcodeValue(cardUrl?: string) {
  if (!cardUrl) return undefined;
  try { return decodeURIComponent(new URL(cardUrl).hash.slice(1)); }
  catch { return cardUrl; }
}

function BarcodeCard({ pilgrim, value }: { pilgrim: Pilgrim; value?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let active = true;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      if (active && ref.current) {
        JsBarcode(ref.current, value ?? pilgrim.pilgrimNo, { format: "CODE128", width: value ? 1.1 : 2, height: 58, displayValue: !value, margin: 8 });
      }
    });
    return () => { active = false; };
  }, [pilgrim.pilgrimNo, value]);

  return (
    <div className="pilgrim-barcode-card" id={`barcode-${pilgrim.id}`}>
      <strong>2027 WYD SEOUL · SEGOK</strong>
      <h3>{pilgrim.name}{pilgrim.baptismalName ? ` (${pilgrim.baptismalName})` : ""}</h3>
      <svg ref={ref} />
      <span>{pilgrim.diocese} · {pilgrim.region}</span>
    </div>
  );
}

export function PilgrimHostAdminPanel({ token, canViewPersonalData }: { token: string; canViewPersonalData: boolean }) {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [form, setForm] = useState<PilgrimForm>(emptyPilgrim());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Pilgrim | null>(null);
  const [query, setQuery] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [message, setMessage] = useState("");
  const [shareChannel, setShareChannel] = useState<"copy" | "email" | "sms">("copy");
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareLanguage, setShareLanguage] = useState<PilgrimCardLanguage>("en");
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = () => api<{ pilgrims: Pilgrim[]; hosts: Host[] }>(`/api/admin/pilgrims?q=${encodeURIComponent(query)}`, {}, token).then((data) => {
    setPilgrims(data.pilgrims);
    setHosts(data.hosts);
    if (selected) setSelected(data.pilgrims.find((item) => item.id === selected.id) ?? null);
  });

  useEffect(() => {
    if (canViewPersonalData) load().catch((error) => setMessage((error as Error).message));
  }, [token, canViewPersonalData]);

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
        const preferredCamera = devices.find((device) => /back|rear|environment|후면/i.test(device.label)) ?? devices[0];
        controls = await reader.decodeFromVideoDevice(preferredCamera?.deviceId, videoRef.current, (result) => {
          if (!result) return;
          const value = result.getText();
          setScanValue(value);
          const found = pilgrims.find((item) => item.pilgrimNo.toLowerCase() === value.toLowerCase());
          if (found) {
            openSelected(found);
            setCameraOpen(false);
          }
        });
        if (active) setCameraStatus("순례자 바코드를 화면 중앙에 맞춰 주세요.");
      } catch (error) {
        if (active) setCameraStatus(cameraErrorMessage(error));
      }
    })();

    return () => {
      active = false;
      permissionStream?.getTracks().forEach((track) => track.stop());
      controls?.stop();
    };
  }, [cameraOpen, pilgrims]);

  if (!canViewPersonalData) {
    return (
      <section className="admin-feature-panel locked-feature">
        <HeartPulse />
        <h2>순례자 건강·식단 정보는 개인정보 관리자만 볼 수 있습니다.</h2>
        <p>건강정보는 민감정보로 분류되어 일반 운영자 화면에서는 가명 처리됩니다.</p>
      </section>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api(editingId ? `/api/admin/pilgrims/${editingId}` : "/api/admin/pilgrims", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      }, token);
      setForm(emptyPilgrim());
      setEditingId(null);
      setMessage("순례자 정보를 저장했습니다.");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const identify = () => {
    const found = pilgrims.find((item) => item.pilgrimNo.toLowerCase() === scanValue.trim().toLowerCase());
    if (found) openSelected(found);
    else setMessage("일치하는 순례자 ID가 없습니다.");
  };

  const edit = (item: Pilgrim) => {
    setEditingId(item.id);
    setForm({
      pilgrimNo: item.pilgrimNo,
      name: item.name,
      baptismalName: item.baptismalName,
      email: item.email,
      preferredLanguage: item.preferredLanguage,
      gender: item.gender,
      diocese: item.diocese,
      region: item.region,
      grade: item.grade,
      age: item.age,
      dietType: item.dietType,
      dietNotes: item.dietNotes,
      allergies: item.allergies,
      healthNotes: item.healthNotes,
      feverStatus: item.feverStatus,
      hostApplicationId: item.hostApplicationId ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openSelected = (item: Pilgrim) => {
    setSelected(item);
    setShareChannel("copy");
    setShareRecipient(item.email || "");
    setShareLanguage(item.preferredLanguage);
    setShareMessage("");
  };

  const issueCard = async (item: Pilgrim, channel: "copy" | "email" | "sms" = "copy", recipient = "") => {
    const data = await api<{ cardUrl: string; expiresAt: string; deliveries: string[]; errors: string[] }>(`/api/admin/pilgrims/${item.id}/share`, { method: "POST", body: JSON.stringify({ channel, recipient, language: shareLanguage }) }, token);
    setPilgrims((current) => current.map((pilgrim) => pilgrim.id === item.id ? { ...pilgrim, cardUrl: data.cardUrl, cardExpiresAt: data.expiresAt, email: channel === "email" ? recipient : pilgrim.email, preferredLanguage: shareLanguage } : pilgrim));
    setSelected((current) => current?.id === item.id ? { ...current, cardUrl: data.cardUrl, cardExpiresAt: data.expiresAt, email: channel === "email" ? recipient : current.email, preferredLanguage: shareLanguage } : current);
    return data;
  };

  const shareCard = async () => {
    if (!selected) return;
    setSharing(true);
    setShareMessage("");
    try {
      const data = await issueCard(selected, shareChannel, shareRecipient);
      if (shareChannel === "copy") {
        await navigator.clipboard.writeText(data.cardUrl).catch(() => undefined);
        setShareMessage(`카드 링크를 발급했습니다. ${data.cardUrl}`);
      } else if (data.deliveries.includes(shareChannel)) {
        setShareMessage(`${shareChannel === "email" ? "이메일" : "SMS"}로 순례자 카드를 발송했습니다.`);
      } else {
        setShareMessage(`링크는 발급했지만 발송하지 못했습니다. ${data.errors.join(" / ")}`);
      }
    } catch (error) { setShareMessage((error as Error).message); }
    finally { setSharing(false); }
  };

  const printBarcode = async (item: Pilgrim) => {
    const win = window.open("", "_blank", "width=500,height=500");
    if (!win) return;
    let cardUrl = item.cardUrl;
    try {
      if (!cardUrl) cardUrl = (await issueCard(item)).cardUrl;
    } catch (error) { win.close(); setMessage((error as Error).message); return; }
    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    container.appendChild(svg);
    const { default: JsBarcode } = await import("jsbarcode");
    JsBarcode(svg, cardBarcodeValue(cardUrl) ?? cardUrl, { format: "CODE128", width: 1.2, height: 64, displayValue: false, margin: 8 });
    const content = `<div class="pilgrim-barcode-card"><strong>2027 WYD SEOUL · SEGOK</strong><h3>${escapeHtml(item.name)}${item.baptismalName ? ` (${escapeHtml(item.baptismalName)})` : ""}</h3>${container.innerHTML}<span>${escapeHtml(item.pilgrimNo)}</span></div>`;
    win?.document.write(`<html><head><title>${item.pilgrimNo}</title><style>body{font-family:sans-serif;display:grid;place-items:center;padding:40px}.pilgrim-barcode-card{text-align:center;border:1px solid #bbb;padding:24px}.pilgrim-barcode-card>*{display:block;margin:8px auto}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`);
    win?.document.close();
  };

  return (
    <section className="admin-feature-panel pilgrim-admin">
      <header><div><span>Pilgrim & host</span><h2>순례자 및 호스트 매핑</h2><p>순례자 ID, 성명·세례명, 배정 가정, 식단·알레르기·발열 정보를 한 화면에서 관리합니다.</p></div></header>

      <div className="scanner-strip">
        <label><ScanBarcode /><input value={scanValue} onChange={(e) => setScanValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && identify()} placeholder="순례자 ID 스캔 또는 입력" /></label>
        <button className="primary" onClick={identify}><Search size={17} /> 조회</button>
        <button className="secondary" onClick={() => { setMessage(""); setCameraStatus(""); setCameraOpen(!cameraOpen); }}><Camera size={17} /> 카메라 스캔</button>
      </div>

      {cameraOpen && (
        <div className="camera-reader">
          <video ref={videoRef} muted playsInline />
          <p className="camera-status" aria-live="polite">{cameraStatus}</p>
          <button className="modal-close-button" onClick={() => setCameraOpen(false)}>닫기</button>
        </div>
      )}
      {message && <p className="form-message">{message}</p>}

      <div className="admin-feature-grid">
        <form className="feature-form" onSubmit={submit}>
          <h3>{editingId ? "순례자 정보 수정" : "순례자 등록"}</h3>
          <div className="form-grid two">
            <label><span>순례자 ID (자동 생성 가능)</span><input value={form.pilgrimNo} onChange={(e) => setForm({ ...form, pilgrimNo: e.target.value })} /></label>
            <label><span>성명</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label><span>세례명</span><input value={form.baptismalName} onChange={(e) => setForm({ ...form, baptismalName: e.target.value })} placeholder="선택 입력" /></label>
            <label><span>이메일 (선택)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="pilgrim@example.org" /></label>
            <label><span>기본 표시 언어</span><select value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value as PilgrimCardLanguage })}>{pilgrimLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span>성별</span><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>남성</option><option>여성</option></select></label>
            <label><span>나이</span><input type="number" min={10} max={100} value={form.age} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} /></label>
            <label><span>교구</span><input required value={form.diocese} onChange={(e) => setForm({ ...form, diocese: e.target.value })} /></label>
            <label><span>지역</span><input required value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></label>
            <label><span>학년</span><input required value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></label>
            <label><span>식단</span><select value={form.dietType} onChange={(e) => setForm({ ...form, dietType: e.target.value })}>{["일반식", "페스코", "락토오보", "락토", "오보", "비건", "육류 제외", "기타"].map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label><span>배정 호스트</span><select value={form.hostApplicationId} onChange={(e) => setForm({ ...form, hostApplicationId: e.target.value })}><option value="">미배정</option>{hosts.map((host) => <option key={host.id} value={host.id}>{host.applicationNo} · {host.name} ({host.capacity}명)</option>)}</select></label>
          <label><span>식단 상세</span><input value={form.dietNotes} onChange={(e) => setForm({ ...form, dietNotes: e.target.value })} /></label>
          <label><span>알레르기</span><input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></label>
          <label><span>건강 및 기타</span><textarea value={form.healthNotes} onChange={(e) => setForm({ ...form, healthNotes: e.target.value })} /></label>
          <label><span>발열 상태</span><select value={form.feverStatus} onChange={(e) => setForm({ ...form, feverStatus: e.target.value })}>{["정상", "관찰", "발열", "진료 필요"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="button-row"><button className="primary" type="submit">{editingId ? "수정 저장" : "순례자 등록"}</button>{editingId && <button className="secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyPilgrim()); }}>취소</button>}</div>
        </form>

        <div>
          <div className="pilgrim-list-tools">
            <label className="community-search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="ID, 성명, 세례명, 이메일, 교구, 지역, 식단 검색" /></label>
            <button className="secondary" onClick={() => load()}>검색</button>
          </div>
          <div className="pilgrim-list">
            {pilgrims.map((item) => (
              <article key={item.id} onClick={() => openSelected(item)}>
                <div><span className={`health-dot ${item.feverStatus !== "정상" ? "warning" : ""}`} /><strong>{item.name}{item.baptismalName ? ` (${item.baptismalName})` : ""}</strong><small>{item.pilgrimNo}</small></div>
                <dl><span>{item.gender} · 만 {item.age}세</span><span>{item.diocese} / {item.region} / {item.grade}</span><span><Utensils /> {item.dietType}{item.allergies ? ` · 알레르기: ${item.allergies}` : ""}</span><span><Link2 /> {item.host ? `${item.host.name} (${item.host.applicationNo})` : "호스트 미배정"}</span></dl>
                <div className="icon-actions">
                  <button onClick={(event) => { event.stopPropagation(); edit(item); }}>수정</button>
                  <button title="바코드 출력" onClick={(event) => { event.stopPropagation(); void printBarcode(item); }}><Printer size={17} /></button>
                  <button title="삭제" onClick={async (event) => { event.stopPropagation(); if (!confirm("순례자 정보를 삭제하시겠습니까?")) return; await api(`/api/admin/pilgrims/${item.id}`, { method: "DELETE" }, token); await load(); }}><Trash2 size={17} /></button>
                </div>
                <div className="print-only"><BarcodeCard pilgrim={item} value={cardBarcodeValue(item.cardUrl)} /></div>
              </article>
            ))}
            {!pilgrims.length && <p className="empty-copy">등록된 순례자가 없습니다.</p>}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-catholic-navy/70 p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="pilgrim-detail-modal" onClick={(event) => event.stopPropagation()}>
            <header><div><span>{selected.pilgrimNo}</span><h2>{selected.name}{selected.baptismalName ? ` (${selected.baptismalName})` : ""} 순례자 카드</h2></div><button className="modal-close-button" onClick={() => setSelected(null)}>닫기</button></header>
            <BarcodeCard pilgrim={selected} value={cardBarcodeValue(selected.cardUrl)} />
            <section className="pilgrim-share-panel">
              <div><span>순례자 카드 송부</span><p>전용 링크에는 순례자 바코드와 다국어 등록·식단 정보가 표시됩니다.</p></div>
              <div className="pilgrim-share-channels">
                <button type="button" className={shareChannel === "copy" ? "active" : ""} onClick={() => setShareChannel("copy")}><Copy size={17} /> 링크 복사</button>
                <button type="button" className={shareChannel === "email" ? "active" : ""} onClick={() => { setShareChannel("email"); setShareRecipient(selected.email || ""); }}><Mail size={17} /> 이메일</button>
                <button type="button" className={shareChannel === "sms" ? "active" : ""} onClick={() => { setShareChannel("sms"); setShareRecipient(""); }}><MessageSquare size={17} /> SMS</button>
              </div>
              <div className="pilgrim-share-fields">
                <label><span>표시 언어</span><select value={shareLanguage} onChange={(event) => setShareLanguage(event.target.value as PilgrimCardLanguage)}>{pilgrimLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                {shareChannel !== "copy" && <label><span>{shareChannel === "email" ? "수신 이메일" : "수신 휴대전화"}</span><input type={shareChannel === "email" ? "email" : "tel"} value={shareRecipient} onChange={(event) => setShareRecipient(event.target.value)} placeholder={shareChannel === "email" ? "pilgrim@example.org" : "+82 10-0000-0000"} /></label>}
                <button className="primary" type="button" disabled={sharing} onClick={() => void shareCard()}><Send size={18} /> {sharing ? "처리 중" : shareChannel === "copy" ? "링크 발급 및 복사" : "카드 발송"}</button>
              </div>
              {selected.cardUrl && <a className="pilgrim-card-link" href={selected.cardUrl} target="_blank" rel="noreferrer">발급된 순례자 카드 열기</a>}
              {shareMessage && <p className="form-message">{shareMessage}</p>}
            </section>
            <div className="pilgrim-alerts">
              <div><Utensils /><span>식단</span><strong>{selected.dietType}</strong><p>{selected.dietNotes || "추가 요청 없음"}</p></div>
              <div><HeartPulse /><span>알레르기·건강</span><strong>{selected.feverStatus}</strong><p>{selected.allergies || "알레르기 없음"} / {selected.healthNotes || "특이사항 없음"}</p></div>
              <div><Link2 /><span>호스트</span><strong>{selected.host?.name || "미배정"}</strong><p>{selected.host?.address || "호스트를 배정해 주세요."}</p></div>
            </div>
            <div className="meal-actions"><span>식사 제공 기록</span>{["아침", "점심", "저녁", "간식"].map((meal) => <button key={meal} className="secondary" onClick={async () => { await api(`/api/admin/pilgrims/${selected.id}/meals`, { method: "POST", body: JSON.stringify({ mealType: meal, note: `${selected.dietType} 기준 제공` }) }, token); await load(); }}>{meal} 제공</button>)}</div>
            <ul className="meal-log-list">{selected.mealLogs?.map((log) => <li key={log.id}>{new Date(log.recordedAt).toLocaleString("ko-KR")} · {log.mealType} · {log.note}</li>)}</ul>
          </div>
        </div>
      )}
    </section>
  );
}
