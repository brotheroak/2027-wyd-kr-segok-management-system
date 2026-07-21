import React, { useEffect, useState } from "react";
import { CalendarClock, MapPin, Trash2, Users } from "lucide-react";
import { api } from "../../api.js";
import type { VolunteerShift } from "../../types.js";

const emptyShift = () => ({ title: "", description: "", location: "세곡동성당", startAt: "", endAt: "", capacity: 20, status: "open" as const });
const toIso = (value: string) => new Date(value).toISOString();
const toLocal = (value: string) => value ? new Date(value).toISOString().slice(0, 16) : "";

export function VolunteerScheduleAdminPanel({ token }: { token: string }) {
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [form, setForm] = useState(emptyShift());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const load = () => api<{ shifts: VolunteerShift[] }>("/api/admin/shifts", {}, token).then((data) => setShifts(data.shifts));
  useEffect(() => { load().catch((error) => setMessage((error as Error).message)); }, [token]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = { ...form, startAt: toIso(form.startAt), endAt: toIso(form.endAt) };
      await api(editingId ? `/api/admin/shifts/${editingId}` : "/api/admin/shifts", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }, token);
      setForm(emptyShift()); setEditingId(null); setMessage("봉사 일정을 저장했습니다."); await load();
    } catch (error) { setMessage((error as Error).message); }
  };
  const remove = async (id: string) => { if (!confirm("일정과 신청 내역을 모두 삭제하시겠습니까?")) return; await api(`/api/admin/shifts/${id}`, { method: "DELETE" }, token); await load(); };
  return <section className="admin-feature-panel"><header><div><span>Volunteer schedule</span><h2>봉사 일정표 및 시간 관리</h2><p>일정을 게시하고 시간대별 신청 인원과 봉사자를 관리합니다.</p></div></header><div className="admin-feature-grid"><form className="feature-form" onSubmit={submit}><label><span>일정명</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label><span>설명</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label><span>장소</span><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><div className="form-grid two"><label><span>시작</span><input type="datetime-local" required value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></label><label><span>종료</span><input type="datetime-local" required value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></label></div><div className="form-grid two"><label><span>정원</span><input type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label><label><span>상태</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "open" })}><option value="open">신청 가능</option><option value="closed">마감</option></select></label></div>{message && <p className="form-message">{message}</p>}<div className="button-row"><button className="primary" type="submit">{editingId ? "일정 수정" : "일정 등록"}</button>{editingId && <button className="secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyShift()); }}>취소</button>}</div></form><div className="admin-shift-list">{shifts.map((shift) => <article key={shift.id}><header><div><span>{shift.status === "open" ? "신청 가능" : "마감"}</span><h3>{shift.title}</h3></div><div className="icon-actions"><button title="수정" onClick={() => { setEditingId(shift.id); setForm({ title: shift.title, description: shift.description, location: shift.location, startAt: toLocal(shift.startAt), endAt: toLocal(shift.endAt), capacity: shift.capacity, status: shift.status as "open" }); }}>수정</button><button title="삭제" onClick={() => remove(shift.id)}><Trash2 size={17} /></button></div></header><p>{shift.description}</p><div className="shift-meta"><span><CalendarClock />{new Date(shift.startAt).toLocaleString("ko-KR")}</span><span><MapPin />{shift.location}</span><span><Users />{shift.signupCount}/{shift.capacity}명</span></div><details><summary>신청 봉사자 {shift.signups?.length ?? 0}명</summary><ul>{shift.signups?.map((signup) => <li key={signup.id}><b>{signup.name}</b><span>{signup.volunteerNo}</span><span>{signup.phone}</span></li>)}</ul></details></article>)}{!shifts.length && <p className="empty-copy">등록된 봉사 일정이 없습니다.</p>}</div></div></section>;
}
