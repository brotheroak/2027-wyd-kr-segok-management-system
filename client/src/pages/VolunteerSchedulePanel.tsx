import React, { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, LogIn, LogOut, MapPin, Users } from "lucide-react";
import { api } from "../api.js";
import type { VolunteerPayload, VolunteerShift } from "../types.js";
import { calendarDays, monthForDateKey, moveMonth, SEOUL_TIME_ZONE, seoulDateKey, shiftOccursOnDate } from "../utils/volunteerCalendar.js";

type VolunteerSchedulePanelProps = {
  token?: string;
  volunteer?: VolunteerPayload;
  onAuthenticate?: () => void;
  onLogout?: () => void;
};

const todayKey = () => seoulDateKey(new Date());

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit"
});

const selectedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long"
});

function shiftState(shift: VolunteerShift) {
  if (shift.registered) return { key: "registered", label: "신청 완료" };
  if (shift.status !== "open") return { key: "closed", label: "마감" };
  if (shift.signupCount >= shift.capacity) return { key: "full", label: "정원 마감" };
  return { key: "open", label: "신청 가능" };
}

export function VolunteerSchedulePanel({ token, volunteer, onAuthenticate, onLogout }: VolunteerSchedulePanelProps) {
  const current = monthForDateKey(todayKey());
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [visibleMonth, setVisibleMonth] = useState(current);
  const initialized = useRef(false);

  useEffect(() => {
    initialized.current = false;
  }, [token]);

  const load = () => api<{ shifts: VolunteerShift[] }>(token ? "/api/volunteer/shifts" : "/api/volunteer/shifts/public", {}, token).then((data) => {
    const sorted = [...data.shifts].sort((left, right) => left.startAt.localeCompare(right.startAt));
    setShifts(sorted);
    if (initialized.current) return;
    const today = todayKey();
    const preferred = sorted.find((shift) => shift.registered && seoulDateKey(shift.endAt) >= today)
      ?? sorted.find((shift) => seoulDateKey(shift.endAt) >= today)
      ?? sorted.at(-1);
    const initialDate = preferred ? seoulDateKey(preferred.startAt) : today;
    setSelectedDate(initialDate);
    setVisibleMonth(monthForDateKey(initialDate));
    initialized.current = true;
  });

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, [token]);

  const toggle = async (shift: VolunteerShift) => {
    if (!token) return onAuthenticate?.();
    try {
      await api(`/api/volunteer/shifts/${shift.id}/signup`, { method: shift.registered ? "DELETE" : "POST" }, token);
      setMessage(shift.registered ? "일정 신청을 취소했습니다." : "봉사 일정에 신청했습니다.");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const monthDays = useMemo(() => calendarDays(visibleMonth.year, visibleMonth.month), [visibleMonth]);
  const shiftsForDate = (key: string) => shifts.filter((shift) => shiftOccursOnDate(shift, key));
  const selectedShifts = useMemo(() => shiftsForDate(selectedDate), [selectedDate, shifts]);
  const monthShiftCount = useMemo(() => {
    const monthStart = `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, "0")}-01`;
    const nextMonth = moveMonth(visibleMonth.year, visibleMonth.month, 1);
    const nextMonthStart = `${nextMonth.year}-${String(nextMonth.month).padStart(2, "0")}-01`;
    return shifts.filter((shift) => seoulDateKey(shift.startAt) < nextMonthStart && seoulDateKey(new Date(new Date(shift.endAt).getTime() - 1)) >= monthStart).length;
  }, [shifts, visibleMonth]);

  const selectDate = (key: string) => {
    setSelectedDate(key);
    const selectedMonth = monthForDateKey(key);
    if (selectedMonth.year !== visibleMonth.year || selectedMonth.month !== visibleMonth.month) setVisibleMonth(selectedMonth);
  };

  const goToday = () => {
    const today = todayKey();
    setSelectedDate(today);
    setVisibleMonth(monthForDateKey(today));
  };

  return (
    <section className="panel volunteer-schedule-panel">
      <div className="section-title"><CalendarClock /><div><h3>봉사 일정 신청</h3><p>달력에서 날짜를 선택해 등록된 일정과 남은 인원을 확인해 주세요.</p></div></div>
      {!token ? (
        <div className="schedule-auth-note">
          <LogIn />
          <div><strong>일정 신청은 봉사자 로그인이 필요합니다.</strong><p>일정은 누구나 확인할 수 있으며, 로그인 후 본인의 신청 상태를 관리할 수 있습니다.</p></div>
          <button className="primary" type="button" onClick={onAuthenticate}>봉사자 로그인</button>
        </div>
      ) : volunteer ? (
        <div className="schedule-auth-note authenticated">
          <BadgeCheck />
          <div><strong>{volunteer.name} 봉사자님 로그인 중</strong><p>{volunteer.volunteerNo} · 신청한 일정은 달력과 일정 카드에 선택 상태로 표시됩니다.</p></div>
          {onLogout && <button className="secondary" type="button" onClick={onLogout}><LogOut size={17} /> 로그아웃</button>}
        </div>
      ) : null}
      {message && <p className="form-message" aria-live="polite">{message}</p>}

      <div className="schedule-calendar-layout">
        <section className="volunteer-calendar" aria-label="봉사 일정 달력">
          <header className="calendar-toolbar">
            <div>
              <span>VOLUNTEER CALENDAR</span>
              <h4>{visibleMonth.year}년 {visibleMonth.month}월</h4>
            </div>
            <div className="calendar-toolbar-actions">
              <button type="button" className="calendar-today-button" onClick={goToday}><CalendarDays size={17} /> 오늘</button>
              <button type="button" className="calendar-icon-button" aria-label="이전 달" onClick={() => setVisibleMonth(moveMonth(visibleMonth.year, visibleMonth.month, -1))}><ChevronLeft /></button>
              <button type="button" className="calendar-icon-button" aria-label="다음 달" onClick={() => setVisibleMonth(moveMonth(visibleMonth.year, visibleMonth.month, 1))}><ChevronRight /></button>
            </div>
          </header>
          <div className="calendar-month-summary">등록 일정 <strong>{monthShiftCount}건</strong></div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="calendar-grid">
            {monthDays.map((day, index) => {
              const dayShifts = shiftsForDate(day.key);
              const selected = day.key === selectedDate;
              const today = day.key === todayKey();
              return (
                <button
                  type="button"
                  key={day.key}
                  className={[
                    "calendar-day",
                    day.currentMonth ? "" : "outside",
                    selected ? "selected" : "",
                    today ? "today" : "",
                    dayShifts.length ? "has-shifts" : ""
                  ].filter(Boolean).join(" ")}
                  aria-pressed={selected}
                  aria-label={`${day.key}, 봉사 일정 ${dayShifts.length}건`}
                  onClick={() => selectDate(day.key)}
                >
                  <time dateTime={day.key} className={index % 7 === 0 ? "sunday" : index % 7 === 6 ? "saturday" : ""}>{day.day}</time>
                  <span className="calendar-day-events">
                    {dayShifts.slice(0, 2).map((shift) => {
                      const state = shiftState(shift);
                      return <span key={shift.id} className={state.key}>{shift.title}</span>;
                    })}
                    {dayShifts.length > 2 && <small>+{dayShifts.length - 2}개</small>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend" aria-label="일정 상태 안내">
            <span><i className="open" />신청 가능</span>
            <span><i className="registered" />신청 완료</span>
            <span><i className="closed" />마감</span>
          </div>
        </section>

        <section className="selected-day-schedule" aria-live="polite">
          <header>
            <span>SELECTED DATE</span>
            <h4>{selectedDateFormatter.format(new Date(`${selectedDate}T12:00:00+09:00`))}</h4>
            <p>등록된 봉사 일정 {selectedShifts.length}건</p>
          </header>
          <div className="shift-grid schedule-day-shifts">
            {selectedShifts.map((shift) => {
              const state = shiftState(shift);
              const disabled = !shift.registered && state.key !== "open";
              return (
                <article key={shift.id} className={shift.registered ? "selected" : ""}>
                  <div><span className={`shift-status ${state.key}`}>{state.label}</span><h4>{shift.title}</h4><p>{shift.description}</p></div>
                  <dl>
                    <div><CalendarClock /><dt>일시</dt><dd>{dateTimeFormatter.format(new Date(shift.startAt))}<br />~ {dateTimeFormatter.format(new Date(shift.endAt))}</dd></div>
                    <div><MapPin /><dt>장소</dt><dd>{shift.location || "추후 안내"}</dd></div>
                    <div><Users /><dt>신청</dt><dd>{shift.signupCount}/{shift.capacity}명</dd></div>
                  </dl>
                  <button type="button" className={shift.registered ? "secondary" : "primary"} disabled={disabled} onClick={() => toggle(shift)}>
                    {shift.registered ? "신청 취소" : !token ? "로그인 후 신청" : state.key === "full" ? "정원 마감" : state.key === "closed" ? "신청 마감" : "이 일정 신청"}
                  </button>
                </article>
              );
            })}
            {!selectedShifts.length && (
              <div className="schedule-day-empty">
                <CalendarDays />
                <strong>등록된 봉사 일정이 없습니다.</strong>
                <p>달력에서 일정 표시가 있는 다른 날짜를 선택해 주세요.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
