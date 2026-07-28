export const SEOUL_TIME_ZONE = "Asia/Seoul";

type ShiftRange = { startAt: string; endAt: string };

export type CalendarDay = {
  key: string;
  day: number;
  currentMonth: boolean;
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function dateParts(value: string | Date) {
  return Object.fromEntries(dateKeyFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
}

export function seoulDateKey(value: string | Date) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calendarDays(year: number, month: number): CalendarDay[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index - firstWeekday + 1));
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      currentMonth: date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    };
  });
}

export function monthForDateKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

export function moveMonth(year: number, month: number, amount: number) {
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function shiftOccursOnDate(shift: ShiftRange, key: string) {
  const start = new Date(shift.startAt);
  const end = new Date(shift.endAt);
  const effectiveEnd = end.getTime() > start.getTime() ? new Date(end.getTime() - 1) : end;
  return seoulDateKey(start) <= key && seoulDateKey(effectiveEnd) >= key;
}
