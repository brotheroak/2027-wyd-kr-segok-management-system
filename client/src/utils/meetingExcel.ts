import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

type RecordItem = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  updated_at?: string;
};
const teams = [
  "총괄",
  "대외협력(재정)",
  "홈스테이",
  "교육",
  "청소년",
  "시설",
  "전산",
  "회계",
];
const fields = ["progress", "discussion", "requests", "decisions", "plans"];
const inputCells = ["B7", "B11", "C12", "B16", "B20"];
const mime =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
function text(value: unknown) {
  return String(value ?? "");
}
function xmlText(value: unknown) {
  const s = text(value).replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,
    "",
  );
  if (s.length > 32767)
    throw Error(
      "한 칸의 내용이 엑셀 제한(32,767자)을 넘습니다. 내용을 나눈 뒤 다시 내려받아 주세요.",
    );
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function setCell(
  xml: string,
  address: string,
  value: unknown,
  options?: { formula?: string; numeric?: boolean; style?: number },
) {
  const re = new RegExp(
    `<c\\b([^>]*?\\br="${address}"[^>]*?)(?:/>|>([\\s\\S]*?)</c>)`,
  );
  if (!re.test(xml))
    throw Error("엑셀 양식의 입력 위치를 찾지 못했습니다: " + address);
  return xml.replace(re, (_, original: string) => {
    let attrs = original.replace(/\s+t="[^"]*"/g, "");
    if (options?.style !== undefined)
      attrs = attrs.replace(/\s+s="[^"]*"/g, "") + ` s="${options.style}"`;
    if (options?.formula)
      return `<c${attrs} t="str"><f>${xmlText(options.formula)}</f><v>${xmlText(value)}</v></c>`;
    if (options?.numeric) return `<c${attrs}><v>${Number(value)}</v></c>`;
    return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
  });
}
function rowHeight(
  xml: string,
  row: number,
  values: unknown[],
  widths: number[],
  minimum: number,
) {
  const lines = Math.max(
    1,
    ...values.map((value, i) =>
      text(value)
        .split("\n")
        .reduce((sum, line) => {
          const width = [...line].reduce(
            (n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1),
            0,
          );
          return sum + Math.max(1, Math.ceil(width / widths[i]));
        }, 0),
    ),
  );
  const height = Math.min(409.5, Math.max(minimum, lines * 14 + 16));
  return xml.replace(
    new RegExp(`<row\\b([^>]*\\br="${row}"[^>]*)>`),
    (_, attrs: string) =>
      `<row${attrs.replace(/\s+(ht|customHeight)="[^"]*"/g, "")} ht="${height}" customHeight="1">`,
  );
}
function serialDate(date: string) {
  return (Date.parse(date + "T00:00:00Z") - Date.UTC(1899, 11, 30)) / 86400000;
}
function addDateStyle(xml: string) {
  const block = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!block) throw Error("엑셀 양식의 날짜 서식을 찾지 못했습니다.");
  const entries = block[1].match(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g) || [];
  // The supplied template already declares date number format 176 (yyyy-mm-dd).
  const source = entries[5]
    .replace(/numFmtId="\d+"/, 'numFmtId="176"')
    .replace(/applyNumberFormat="[^"]*"/, 'applyNumberFormat="1"');
  return {
    xml: xml.replace(
      block[0],
      `<cellXfs count="${entries.length + 1}">${block[1]}${source}</cellXfs>`,
    ),
    style: entries.length,
  };
}
function expandTasks(xml: string, count: number) {
  const extra = Math.max(0, count - 8);
  if (!extra) return xml;
  const row = /<row\b[^>]*\br="26"[^>]*>[\s\S]*?<\/row>/.exec(xml)?.[0];
  if (!row) throw Error("후속조치 양식의 행을 찾지 못했습니다.");
  // Shift the next-meeting area before inserting extra styled task rows.
  xml = xml.replace(/(<row\b[^>]*\br=")(\d+)(")/g, (m, a, n, b) =>
    Number(n) >= 27 ? a + (Number(n) + extra) + b : m,
  );
  xml = xml.replace(/(<c\b[^>]*\br="[A-Z]+)(\d+)(")/g, (m, a, n, b) =>
    Number(n) >= 27 ? a + (Number(n) + extra) + b : m,
  );
  xml = xml.replace(
    /(<mergeCell\b[^>]*\bref=")([^"]+)(")/g,
    (_, a, ref, b) =>
      a +
      ref.replace(/([A-Z]+)(\d+)/g, (m: string, c: string, n: string) =>
        Number(n) >= 27 ? c + (Number(n) + extra) : m,
      ) +
      b,
  );
  const rows = Array.from({ length: extra }, (_, i) =>
    row.replace(/(\br="(?:[A-Z]+)?)(26)(")/g, `$1${27 + i}$3`),
  ).join("");
  xml = xml.replace("</sheetData>", rows + "</sheetData>");
  // Sort inserted rows back into worksheet order.
  xml = xml.replace(/<sheetData>([\s\S]*?)<\/sheetData>/, (_, body: string) => {
    const rows = body.match(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g) || [];
    rows.sort(
      (a, b) =>
        Number(/\br="(\d+)"/.exec(a)?.[1]) - Number(/\br="(\d+)"/.exec(b)?.[1]),
    );
    return "<sheetData>" + rows.join("") + "</sheetData>";
  });
  xml = xml.replace(
    /<mergeCells\b[^>]*count="(\d+)"([^>]*)>([\s\S]*?)<\/mergeCells>/,
    (_, count, rest, body) =>
      `<mergeCells count="${Number(count) + extra}"${rest}>${body}${Array.from({ length: extra }, (_, i) => `<mergeCell ref="B${27 + i}:C${27 + i}"/>`).join("")}</mergeCells>`,
  );
  return xml;
}
/** Fill the original workbook package without rebuilding styles, merges or sheet layout. */
export function buildMeetingExcel(
  template: Uint8Array,
  meeting: RecordItem,
  records: RecordItem[],
) {
  const files = unzipSync(template);
  const reports = records.filter(
    (r) => r.kind === "report" && r.payload.meeting === meeting.id,
  );
  const tasks = records.filter(
    (r) => r.kind === "task" && r.payload.meeting === meeting.id,
  );
  const m = meeting.payload;
  const date = text(m.date),
    time = text(m.time),
    title = text(m.title);
  const datetime = `${date.replace(/^(\d+)-(\d+)-(\d+)$/, "$1년 $2월 $3일")} ${time}`;
  const style = addDateStyle(strFromU8(files["xl/styles.xml"]));
  files["xl/styles.xml"] = strToU8(style.xml);
  let main = expandTasks(
    strFromU8(files["xl/worksheets/sheet2.xml"]),
    tasks.length,
  );
  main = setCell(main, "A1", `WYD ${title} 공동회의록`);
  main = setCell(main, "B3", datetime);
  main = setCell(main, "D3", m.location);
  main = setCell(main, "B4", m.attendees);
  main = rowHeight(main, 4, [m.attendees], [160], 24);
  let written = 0;
  for (const [i, team] of teams.entries()) {
    const report = reports.find((r) => r.payload.team === team);
    const p = report?.payload || {};
    if (fields.some((key) => text(p[key]).trim())) written++;
    const key = `xl/worksheets/sheet${i + 3}.xml`;
    let sheet = strFromU8(files[key]);
    sheet = setCell(sheet, "B1", `WYD ${title} · ${team} 팀 작성란`);
    sheet = setCell(sheet, "C3", p.author);
    const editedDate = report?.updated_at?.slice(0, 10);
    sheet = setCell(
      sheet,
      "F3",
      editedDate ? serialDate(editedDate) : "",
      editedDate ? { numeric: true, style: style.style } : undefined,
    );
    fields.forEach((field, j) => {
      sheet = setCell(sheet, inputCells[j], p[field]);
      sheet = rowHeight(
        sheet,
        Number(inputCells[j].replace(/\D/g, "")),
        [p[field]],
        [j === 2 ? 80 : 100],
        j === 2 ? 24 : 90,
      );
      const ref = `'${team.replace(/'/g, "''")}'!$${inputCells[j].replace(/(\D+)(\d+)/, "$1$$$2")}`;
      main = setCell(main, `${"BCDEF"[j]}${8 + i}`, p[field], {
        formula: `IF(${ref}="","",${ref})`,
      });
    });
    main = rowHeight(
      main,
      8 + i,
      fields.map((key) => p[key]),
      [36, 32, 10, 28, 32],
      120,
    );
    files[key] = strToU8(sheet);
  }
  // Keep the template's native COUNTIF formula and update its cached result.
  const countFormula = /<c\b[^>]*\br="B5"[^>]*>[\s\S]*?<f>([\s\S]*?)<\/f>/.exec(
    main,
  )?.[1];
  if (!countFormula) throw Error("엑셀 양식의 작성 현황 수식이 없습니다.");
  main = main.replace(
    /(<c\b[^>]*\br="B5"[^>]*>[\s\S]*?<v>)[\s\S]*?(<\/v>)/,
    `$1${written} / 8팀 작성$2`,
  );
  const total = Math.max(8, tasks.length);
  for (let i = 0; i < total; i++) {
    const row = 19 + i,
      t = tasks[i]?.payload;
    main = setCell(main, `A${row}`, i + 1, { numeric: true });
    main = setCell(main, `B${row}`, t?.title);
    main = setCell(main, `D${row}`, t?.team);
    main = setCell(
      main,
      `E${row}`,
      t?.due ? serialDate(text(t.due)) : "",
      t?.due ? { numeric: true, style: style.style } : undefined,
    );
    const note = t
      ? [t.owner ? `담당자: ${t.owner}` : "", t.status, t.notes]
          .filter(Boolean)
          .join("\n")
      : "";
    main = setCell(main, `F${row}`, note);
    main = rowHeight(main, row, [t?.title, t?.team, note], [68, 10, 32], 45);
  }
  files["xl/worksheets/sheet2.xml"] = strToU8(main);
  let guide = strFromU8(files["xl/worksheets/sheet1.xml"]);
  guide = setCell(guide, "B1", `WYD ${title} 공동회의록 작성안내`);
  guide = setCell(
    guide,
    "B2",
    `일시: ${datetime}  |  장소: ${text(m.location)}`,
  );
  files["xl/worksheets/sheet1.xml"] = strToU8(guide);
  let workbook = strFromU8(files["xl/workbook.xml"]);
  workbook = workbook.replace(
    /<calcPr\b[^>]*\/>/,
    '<calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/>',
  );
  const names = ["작성안내", "공동회의록", ...teams]
    .map(
      (name, i) =>
        `<definedName name="_xlnm.Print_Area" localSheetId="${i}">${xmlText(`'${name}'!${i === 0 ? "$B$1:$C$17" : i === 1 ? "$A$1:$F$" + (28 + Math.max(0, tasks.length - 8)) : "$B$1:$F$20"}`)}</definedName>`,
    )
    .join("");
  workbook = workbook.replace(
    "</sheets>",
    "</sheets><definedNames>" + names + "</definedNames>",
  );
  files["xl/workbook.xml"] = strToU8(workbook);
  return zipSync(files, { level: 6 });
}
export async function downloadMeetingExcel(
  meeting: RecordItem,
  records: RecordItem[],
) {
  const response = await fetch("/meeting-template.xlsx");
  if (!response.ok)
    throw Error("기존 엑셀 양식을 불러오지 못했습니다. 다시 시도해 주세요.");
  const bytes = buildMeetingExcel(
    new Uint8Array(await response.arrayBuffer()),
    meeting,
    records,
  );
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${text(meeting.payload.title).replace(/[\\/:*?"<>|]/g, "_") || "공동회의록"}_${text(meeting.payload.date)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
