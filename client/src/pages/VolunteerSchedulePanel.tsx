import React, { useEffect, useState } from "react";
import { CalendarClock, LogIn, MapPin, Users } from "lucide-react";
import { api } from "../api.js";
import type { VolunteerShift } from "../types.js";

export function VolunteerSchedulePanel({ token, onAuthenticate }: { token?: string; onAuthenticate?: () => void }) {
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [message, setMessage] = useState("");
  const load = () => api<{ shifts: VolunteerShift[] }>(token ? "/api/volunteer/shifts" : "/api/volunteer/shifts/public", {}, token).then((data) => setShifts(data.shifts));
  useEffect(() => { load().catch((error) => setMessage((error as Error).message)); }, [token]);
  const toggle = async (shift: VolunteerShift) => {
    if (!token) return onAuthenticate?.();
    try {
      await api(`/api/volunteer/shifts/${shift.id}/signup`, { method: shift.registered ? "DELETE" : "POST" }, token);
      setMessage(shift.registered ? "일정 신청을 취소했습니다." : "봉사 일정에 신청했습니다.");
      await load();
    } catch (error) { setMessage((error as Error).message); }
  };
  const format = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <section className="panel volunteer-schedule-panel"><div className="section-title"><CalendarClock /><div><h3>봉사 일정 신청</h3><p>모집 일정 중 참여 가능한 시간을 선택해 주세요.</p></div></div>{!token && <div className="schedule-auth-note"><LogIn /><div><strong>자원봉사자 접수 확인 후 신청할 수 있습니다.</strong><p>일정은 누구나 확인할 수 있으며, 신청 시 성명과 연락처로 접수 내역을 확인합니다.</p></div><button className="secondary" type="button" onClick={onAuthenticate}>접수 확인</button></div>}{message && <p className="form-message">{message}</p>}<div className="shift-grid">{shifts.map((shift) => <article key={shift.id} className={shift.registered ? "selected" : ""}><div><span>{shift.status === "open" ? "신청 가능" : "마감"}</span><h4>{shift.title}</h4><p>{shift.description}</p></div><dl><div><CalendarClock /><dt>일시</dt><dd>{format(shift.startAt)} - {format(shift.endAt)}</dd></div><div><MapPin /><dt>장소</dt><dd>{shift.location || "추후 안내"}</dd></div><div><Users /><dt>신청</dt><dd>{shift.signupCount}/{shift.capacity}명</dd></div></dl><button className={shift.registered ? "secondary" : "primary"} disabled={shift.status !== "open" && !shift.registered} onClick={() => toggle(shift)}>{shift.registered ? "신청 취소" : token ? "이 일정 신청" : "접수 확인 후 신청"}</button></article>)}{!shifts.length && <p className="empty-copy">현재 등록된 봉사 일정이 없습니다.</p>}</div></section>;
}
