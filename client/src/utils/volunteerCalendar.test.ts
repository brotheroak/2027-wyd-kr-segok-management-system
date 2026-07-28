import assert from "node:assert/strict";
import test from "node:test";
import { calendarDays, moveMonth, seoulDateKey, shiftOccursOnDate } from "./volunteerCalendar.js";

test("달력은 이전 달과 다음 달을 포함한 6주 42일을 반환한다", () => {
  const days = calendarDays(2027, 8);
  assert.equal(days.length, 42);
  assert.equal(days[0].key, "2027-08-01");
  assert.equal(days[41].key, "2027-09-11");
  assert.equal(days.filter((day) => day.currentMonth).length, 31);
});

test("서울 시간 기준 날짜를 사용한다", () => {
  assert.equal(seoulDateKey("2027-08-02T16:00:00.000Z"), "2027-08-03");
});

test("여러 날 일정은 포함 날짜마다 표시하고 자정 종료일은 제외한다", () => {
  const shift = {
    startAt: "2027-08-02T12:00:00.000Z",
    endAt: "2027-08-03T15:00:00.000Z"
  };
  assert.equal(shiftOccursOnDate(shift, "2027-08-02"), true);
  assert.equal(shiftOccursOnDate(shift, "2027-08-03"), true);
  assert.equal(shiftOccursOnDate(shift, "2027-08-04"), false);
});

test("월 이동은 연도 경계를 처리한다", () => {
  assert.deepEqual(moveMonth(2027, 1, -1), { year: 2026, month: 12 });
  assert.deepEqual(moveMonth(2027, 12, 1), { year: 2028, month: 1 });
});
