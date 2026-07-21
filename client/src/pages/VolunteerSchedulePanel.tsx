import React, { useEffect, useState } from "react";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { api } from "../api.js";
import type { VolunteerShift } from "../types.js";

export function VolunteerSchedulePanel({ token }: { token: string }) {
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [message, setMessage] = useState("");
  const load = () => api<{ shifts: VolunteerShift[] }>("/api/volunteer/shifts", {}, token).then((data) => setShifts(data.shifts));
  useEffect(() => { load().catch((error) => setMessage((error as Error).message)); }, [token]);
  const toggle = async (shift: VolunteerShift) => {
    try {
      await api(`/api/volunteer/shifts/${shift.id}/signup`, { method: shift.registered ? "DELETE" : "POST" }, token);
      setMessage(shift.registered ? "일정 신청을 취소했습니다." : "봉사 일정에 신청했습니다.");
      await load();
    } catch (error) { setMessage((error as Error).message); }
  };
  const format = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <section className="panel volunteer-schedule-panel"><div className="section-title"><CalendarClock /><div><h3>봉사 일정 신청</h3><p>승인된 일정 중 참여 가능한 시간을 선택해 주세요.</p></div></div>{message && <p className="form-message">{message}</p>}<div className="shift-grid">{shifts.map((shift) => <article key={shift.id} className={shift.registered ? "selected" : ""}><div><span>{shift.status === "open" ? "신청 가능" : "마감"}</span><h4>{shift.title}</h4><p>{shift.description}</p></div><dl><div><CalendarClock /><dt>일시</dt><dd>{format(shift.startAt)} - {format(shift.endAt)}</dd></div><div><MapPin /><dt>장소</dt><dd>{shift.location || "추후 안내"}</dd></div><div><Users /><dt>신청</dt><dd>{shift.signupCount}/{shift.capacity}명</dd></div></dl><button className={shift.registered ? "secondary" : "primary"} disabled={shift.status !== "open" && !shift.registered} onClick={() => toggle(shift)}>{shift.registered ? "신청 취소" : "이 일정 신청"}</button></article>)}{!shifts.length && <p className="empty-copy">현재 신청 가능한 봉사 일정이 없습니다.</p>}</div></section>;
}
