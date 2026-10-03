import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { buildMeetingExcel } from "./meetingExcel.js";
const template = new Uint8Array(
  readFileSync("client/public/meeting-template.xlsx"),
);
const meeting = {
  id: "meeting-test",
  kind: "meeting",
  payload: {
    title: "11월 회의",
    date: "2026-11-07",
    time: "10:30",
    location: "회의실 & 교육관",
    attendees: "구성원",
  },
};
const report = {
  id: "report-test",
  kind: "report",
  updated_at: "2026-11-06T03:00:00Z",
  payload: {
    meeting: meeting.id,
    team: "총괄",
    author: "테스트 작성자",
    progress: "=1+1 & <진행>",
    discussion: "논의",
    requests: "전산",
    decisions: "확정",
    plans: "준비",
  },
};
const task = (i: number) => ({
  id: `task-${i}`,
  kind: "task",
  payload: {
    meeting: meeting.id,
    title: `결정 ${i}`,
    team: "전산",
    due: "2026-11-15",
    owner: "담당자",
    status: "진행 중",
    notes: "후속 계획",
  },
});
test("original workbook export keeps all 10 sheets, native formulas, template styling and safe literal inputs", () => {
  const files = unzipSync(
    buildMeetingExcel(template, meeting, [report, task(1)]),
  );
  const main = strFromU8(files["xl/worksheets/sheet2.xml"]),
    division = strFromU8(files["xl/worksheets/sheet3.xml"]);
  assert.equal(
    Object.keys(files).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
      .length,
    10,
  );
  assert.match(
    division,
    /<c[^>]*r="B7"[^>]*t="inlineStr"><is><t[^>]*>=1\+1 &amp; &lt;진행&gt;/,
  );
  assert.match(main, /<f>IF\(&apos;|<f>IF\('/);
  assert.ok(main.includes("'총괄'!$B$7"));
  assert.ok(main.includes("1 / 8팀 작성"));
  assert.ok(main.includes("결정 1"));
  assert.match(main, /<c[^>]*r="E19"[^>]*><v>\d+<\/v><\/c>/);
  assert.match(main, /<pageSetup[^>]*orientation="landscape"/);
  assert.equal(
    strFromU8(files["xl/worksheets/sheet3.xml"]).match(
      /<mergeCells[^>]*>[\s\S]*?<\/mergeCells>/,
    )?.[0],
    strFromU8(unzipSync(template)["xl/worksheets/sheet3.xml"]).match(
      /<mergeCells[^>]*>[\s\S]*?<\/mergeCells>/,
    )?.[0],
  );
});
test("exports every linked task beyond the original 8 rows and shifts the next-meeting area", () => {
  const files = unzipSync(
    buildMeetingExcel(template, meeting, [
      report,
      ...Array.from({ length: 11 }, (_, i) => task(i + 1)),
      { ...task(99), payload: { ...task(99).payload, meeting: "other" } },
    ]),
  );
  const main = strFromU8(files["xl/worksheets/sheet2.xml"]);
  assert.ok(main.includes("결정 11"));
  assert.ok(!main.includes("결정 99"));
  assert.ok(main.includes('ref="B29:C29"'));
  assert.ok(main.includes('r="A31"'));
  assert.ok(strFromU8(files["xl/workbook.xml"]).includes("$A$1:$F$31"));
  const rows = [...main.matchAll(/<row\b[^>]*r="(\d+)"/g)].map((m) =>
    Number(m[1]),
  );
  assert.equal(new Set(rows).size, rows.length);
  assert.deepEqual(
    rows,
    [...rows].sort((a, b) => a - b),
  );
});
test("empty meeting exports no stale source content and overlong cells are rejected", () => {
  const files = unzipSync(buildMeetingExcel(template, meeting, []));
  assert.ok(
    strFromU8(files["xl/worksheets/sheet2.xml"]).includes("0 / 8팀 작성"),
  );
  for (const bytes of Object.values(files)) {
    const s = strFromU8(bytes);
    assert.ok(!/어승섭|최병혁|윤효영|김양성|d.docs.live.net/.test(s));
  }
  assert.throws(
    () =>
      buildMeetingExcel(template, meeting, [
        {
          ...report,
          payload: { ...report.payload, progress: "가".repeat(32768) },
        },
      ]),
    /32,767/,
  );
});
