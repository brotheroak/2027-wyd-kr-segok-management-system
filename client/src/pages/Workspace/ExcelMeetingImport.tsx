import React, { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { api } from "../../api.js";
import { parseMeetingExcel, importFields, importTeams, type ExcelMeetingPreview } from "../../utils/meetingExcelImport.js";

export function ExcelMeetingImport({ token, disabled, existing, onImported }: {
  token: string; disabled: boolean;
  existing: { kind: string; payload: Record<string, unknown> }[];
  onImported: (id: string) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null), dialog = useRef<HTMLDialogElement>(null), lock = useRef(false);
  const [preview, setPreview] = useState<ExcelMeetingPreview | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (preview && !dialog.current?.open) dialog.current?.showModal(); if (!preview) dialog.current?.close(); }, [preview]);
  async function select(file: File) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (!/\.xlsx$/i.test(file.name)) throw Error("기존 WYD 양식의 엑셀(.xlsx) 파일을 선택해 주세요.");
      if (file.size > 12 * 1024 * 1024) throw Error("엑셀 파일은 12MB 이하로 선택해 주세요.");
      setPreview(parseMeetingExcel(new Uint8Array(await file.arrayBuffer()), file.name));
    } catch (e) { setError(e instanceof Error ? e.message : "엑셀 파일을 읽지 못했습니다."); }
    finally { lock.current = false; setBusy(false); if (input.current) input.current.value = ""; }
  }
  function edit(index: number, key: string, value: string) {
    setPreview(p => p && ({ ...p, records: p.records.map((r, i) => i === index ? { ...r, payload: { ...r.payload, [key]: value } } : r) }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!preview || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    let saved = false;
    try {
      await api("/api/collaboration/import", { method: "POST", body: JSON.stringify({ format: "wyd-collaboration-v1", records: preview.records }) }, token);
      saved = true;
      await onImported(preview.records[0].id);
      setPreview(null);
    } catch (e) {
      if (saved) { setPreview(null); setError("회의록은 저장됐습니다. 화면을 새로고침해 확인해 주세요."); }
      else setError(e instanceof Error ? e.message : "회의록을 저장하지 못했습니다.");
    } finally { lock.current = false; setBusy(false); }
  }
  const m = preview?.records[0].payload;
  const duplicate = m && existing.some(r => r.kind === "meeting" && r.payload.title === m.title && r.payload.date === m.date);
  return <>
    <button disabled={disabled || busy} onClick={() => input.current?.click()}><FileUp size={16} />{busy ? "엑셀 읽는 중…" : "엑셀 회의록 가져오기"}</button>
    <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={e => { if (e.target.files?.[0]) void select(e.target.files[0]); }} />
    {!preview && error && <p role="alert">{error}</p>}
    <dialog ref={dialog} className="collab-dialog excel-import-dialog" aria-labelledby="excel-import-title" onCancel={e => { if (busy) e.preventDefault(); else setPreview(null); }}>
      <header><h3 id="excel-import-title">엑셀 회의록 가져오기</h3><button type="button" disabled={busy} onClick={() => setPreview(null)}>닫기</button></header>
      {preview && m && <form onSubmit={submit}>
        <p>{preview.fileName}</p><p>아래 내용을 확인하고 수정한 뒤 저장하세요. 기존 회의는 유지하고 새 회의를 만듭니다. 원본 파일은 문서함에 별도로 올릴 수 있습니다.</p>
        {preview.warnings.map(w => <p className="collab-notice" key={w}>{w}</p>)}
        {duplicate && <p className="collab-notice">같은 제목과 날짜의 회의가 이미 있습니다. 다시 가져오면 별도 회의가 추가됩니다.</p>}
        <fieldset disabled={busy}>
          <label>회의 제목<input required maxLength={200} value={m.title} onChange={e => edit(0, "title", e.target.value)} /></label>
          <div className="excel-import-datetime"><label>회의 날짜<input type="date" required value={m.date} onChange={e => edit(0, "date", e.target.value)} /></label><label>회의 시간<input type="time" required value={m.time} onChange={e => edit(0, "time", e.target.value)} /></label></div>
          <label>장소<input maxLength={30000} value={m.location} onChange={e => edit(0, "location", e.target.value)} /></label>
          <label>참석자<textarea maxLength={30000} value={m.attendees} onChange={e => edit(0, "attendees", e.target.value)} /></label>
          <h4>분과 기록 · 8개</h4>
          {preview.records.slice(1, 9).map((r, i) => <details key={r.id}><summary>{r.payload.team} · {importFields.some(k => r.payload[k].trim()) ? "내용 있음" : "빈 작성란"}</summary>
            <label>작성자<input maxLength={200} value={r.payload.author} onChange={e => edit(i + 1, "author", e.target.value)} /></label>
            {importFields.map((key, j) => <label key={key}>{["진행사항", "상호협조(논의)사항", "협조 요청 팀", "결정 사항", "향후 계획"][j]}<textarea maxLength={30000} value={r.payload[key]} onChange={e => edit(i + 1, key, e.target.value)} /></label>)}
          </details>)}
          <h4>후속 업무 · {preview.records.length - 9}개</h4>
          {preview.records.slice(9).map((r, i) => <details key={r.id}><summary>{r.payload.title}</summary>
            <label>할 일<input required maxLength={200} value={r.payload.title} onChange={e => edit(i + 9, "title", e.target.value)} /></label>
            <label>분과<select value={r.payload.team} onChange={e => edit(i + 9, "team", e.target.value)}>{["전체", ...importTeams].map(t => <option key={t}>{t}</option>)}</select></label>
            <label>진행 상태<select value={r.payload.status} onChange={e => edit(i + 9, "status", e.target.value)}>{["할 일", "진행 중", "완료"].map(t => <option key={t}>{t}</option>)}</select></label>
            <label>담당자<input maxLength={200} value={r.payload.owner} onChange={e => edit(i + 9, "owner", e.target.value)} /></label>
            <label>기한<input type="date" value={r.payload.due} onChange={e => edit(i + 9, "due", e.target.value)} /></label>
            <label>메모<textarea maxLength={30000} value={r.payload.notes} onChange={e => edit(i + 9, "notes", e.target.value)} /></label>
          </details>)}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <footer><button type="button" disabled={busy} onClick={() => setPreview(null)}>취소</button><button disabled={busy} type="submit">{busy ? "저장 중…" : "새 회의로 저장"}</button></footer>
      </form>}
    </dialog>
  </>;
}
