import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";

export const importTeams = ["총괄", "대외협력(재정)", "홈스테이", "교육", "청소년", "시설", "전산", "회계"];
export const importFields = ["progress", "discussion", "requests", "decisions", "plans"];
export type ImportedRecord = { id: string; kind: string; payload: Record<string, string> };
export type ExcelMeetingPreview = { fileName: string; records: ImportedRecord[]; warnings: string[] };
const list = (v: any): any[] => v === undefined ? [] : Array.isArray(v) ? v : [v];
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, parseAttributeValue: false, trimValues: false, removeNSPrefix: true });
function xml(bytes: Uint8Array | undefined) {
  if (!bytes) throw Error("필수 엑셀 시트를 찾지 못했습니다. 기존 WYD 공동회의록 양식을 선택해 주세요.");
  const s = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(s) || XMLValidator.validate(s) !== true) throw Error("엑셀 내부 문서가 올바르지 않습니다.");
  return parser.parse(s);
}
function rich(v: any): string {
  if (v === undefined) return "";
  if (typeof v !== "object") return String(v);
  if (v.t !== undefined) return list(v.t).map(t => typeof t === "object" ? t["#text"] ?? "" : t).join("");
  return list(v.r).map(rich).join("");
}
type Cell = { value: string; formula: boolean };
function cells(bytes: Uint8Array, strings: string[]) {
  const result = new Map<string, Cell>();
  for (const row of list(xml(bytes).worksheet?.sheetData?.row)) {
    for (const c of list(row.c)) {
      const type = c["@_t"], raw = String(c.v ?? "");
      if (type === "e") throw Error(`엑셀 ${c["@_r"]} 칸에 오류가 있습니다. 엑셀에서 수정한 뒤 다시 선택해 주세요.`);
      const value = type === "s" ? strings[Number(raw)] : type === "inlineStr" ? rich(c.is) : raw;
      if (value === undefined || value.length > 30000) throw Error("엑셀 셀의 내용이 없거나 너무 깁니다. 셀당 30,000자 이하로 작성해 주세요.");
      result.set(c["@_r"], { value, formula: c.f !== undefined });
    }
  }
  return result;
}
function excelDate(value: string, date1904: boolean) {
  const match = /^(\d{4})\s*(?:년|[-./])\s*(\d{1,2})\s*(?:월|[-./])\s*(\d{1,2})/.exec(value.trim());
  if (match) {
    const result = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    if (!Number.isNaN(Date.parse(result)) && new Date(result).toISOString().slice(0, 10) === result) return result;
    return "";
  }
  if (/^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0 && Number(value) < 100000) {
    return new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + Math.floor(Number(value)) * 86400000).toISOString().slice(0, 10);
  }
  return "";
}
function excelTime(value: string) {
  const m = /(오전|오후)?\s*(\d{1,2}):([0-5]\d)/.exec(value);
  if (!m) {
    if (/^\d+\.\d+$/.test(value)) {
      const minutes = Math.round((Number(value) % 1) * 1440) % 1440;
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    }
    return "";
  }
  let hour = Number(m[2]);
  if (m[1] && hour >= 1 && hour <= 12) hour = hour % 12 + (m[1] === "오후" ? 12 : 0);
  return hour < 24 ? `${String(hour).padStart(2, "0")}:${m[3]}` : "";
}
/** Reads values only. Formulas, macros and external links are never executed. */
export function parseMeetingExcel(bytes: Uint8Array, fileName: string, id: string = crypto.randomUUID()): ExcelMeetingPreview {
  if (bytes.length > 12 * 1024 * 1024) throw Error("엑셀 파일은 12MB 이하로 선택해 주세요.");
  let total = 0;
  const files = unzipSync(bytes, { filter: f => {
    if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name)) return false;
    total += f.originalSize;
    if (f.originalSize > 4 * 1024 * 1024 || total > 16 * 1024 * 1024) throw Error("엑셀 내용이 너무 큽니다. 회의록만 포함한 파일을 선택해 주세요.");
    return true;
  }});
  const workbook = xml(files["xl/workbook.xml"]).workbook;
  const rels = list(xml(files["xl/_rels/workbook.xml.rels"]).Relationships?.Relationship);
  const strings = files["xl/sharedStrings.xml"] ? list(xml(files["xl/sharedStrings.xml"]).sst?.si).map(rich) : [];
  const sheets = new Map<string, Map<string, Cell>>();
  for (const sheet of list(workbook.sheets?.sheet)) {
    const name = sheet["@_name"];
    if (name !== "공동회의록" && !importTeams.includes(name)) continue;
    // removeNSPrefix also removes the r: prefix on relationship IDs.
    const rel = rels.find(r => r["@_Id"] === sheet["@_id"]);
    const target = String(rel?.["@_Target"] ?? "");
    if (rel?.["@_TargetMode"] === "External" || target.includes("..")) throw Error("엑셀 시트 연결이 올바르지 않습니다.");
    const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    sheets.set(name, cells(files[path], strings));
  }
  if (!sheets.has("공동회의록") || importTeams.some(t => !sheets.has(t))) throw Error("공동회의록과 8개 분과 시트가 있는 기존 WYD 엑셀 양식이 필요합니다.");
  const main = sheets.get("공동회의록")!;
  const value = (sheet: Map<string, Cell>, ref: string) => sheet.get(ref)?.value ?? "";
  if (value(main, "A3") !== "일시" || value(main, "A4") !== "참석자" || value(main, "A7") !== "팀") throw Error("기존 WYD 양식의 입력 위치가 달라졌습니다. 원래 양식을 사용해 주세요.");
  const warnings: string[] = [];
  const date1904 = ["1", "true"].includes(String(workbook.workbookPr?.["@_date1904"]));
  const datetime = value(main, "B3");
  const meeting: ImportedRecord = { id, kind: "meeting", payload: {
    title: value(main, "A1").replace(/^WYD\s*/, "").replace(/\s*공동회의록\s*$/, "").trim() || fileName.replace(/\.xlsx$/i, ""),
    date: excelDate(datetime, date1904), time: excelTime(datetime), location: value(main, "D3"), attendees: value(main, "B4"), status: "작성 중",
  }};
  if (!meeting.payload.date || !meeting.payload.time) warnings.push("회의 날짜 또는 시간을 읽지 못했습니다. 아래 회의 정보를 입력해 주세요.");
  const reports = importTeams.map((team, i): ImportedRecord => {
    const sheet = sheets.get(team)!;
    if (value(sheet, "B12") !== "협조 요청 팀") throw Error(`${team} 시트의 입력 위치가 달라졌습니다. 원래 양식을 사용해 주세요.`);
    const payload: Record<string, string> = { meeting: id, team, author: value(sheet, "C3") };
    importFields.forEach((field, j) => {
      const ref = ["B7", "B11", "C12", "B16", "B20"][j];
      const common = main.get(`${"BCDEF"[j]}${8 + i}`);
      payload[field] = value(sheet, ref) || (common && !common.formula ? common.value : "");
      if (sheet.get(ref)?.formula) warnings.push(`${team} 작성란의 수식은 마지막 저장된 결과만 가져옵니다.`);
      if (value(sheet, ref) && common && !common.formula && common.value && common.value !== payload[field]) warnings.push(`${team}의 공동회의록 내용과 분과 시트가 달라 분과 시트를 우선했습니다.`);
    });
    return { id: `${id}-report-${i}`, kind: "report", payload };
  });
  const tasks: ImportedRecord[] = [];
  const lastRow = Math.max(...[...main.keys()].map(ref => Number(ref.replace(/\D/g, ""))));
  if (lastRow > 10000) throw Error("회의록의 행 수가 너무 많습니다.");
  for (let row = 19; row <= lastRow; row++) {
    if (value(main, `A${row}`).includes("차기 회의")) {
      if (["B", "C", "D", "E", "F"].some(col => value(main, `${col}${row}`).trim())) warnings.push("차기 회의 메모는 자동으로 가져오지 않습니다. 필요하면 저장 후 회의록에 별도로 기록해 주세요.");
      break;
    }
    const title = value(main, `B${row}`).trim();
    if (!title) continue;
    if (tasks.length >= 100) throw Error("후속 업무는 한 번에 100개까지 가져올 수 있습니다.");
    const rawTeam = value(main, `D${row}`).trim();
    const rawDue = value(main, `E${row}`), note = value(main, `F${row}`);
    const due = excelDate(rawDue, date1904);
    if (rawDue && !due) warnings.push(`후속 업무 ${tasks.length + 1}의 기한을 읽지 못해 메모에 남겼습니다.`);
    if (rawTeam && !importTeams.includes(rawTeam) && rawTeam !== "전체") warnings.push(`후속 업무 ${tasks.length + 1}의 분과를 '전체'로 지정하고 원문을 메모에 남겼습니다.`);
    const status = note.split("\n").find(s => ["할 일", "진행 중", "완료"].includes(s.trim()))?.trim() || "할 일";
    const owner = /^담당자:\s*(.*)$/m.exec(note)?.[1] ?? "";
    tasks.push({ id: `${id}-task-${tasks.length}`, kind: "task", payload: { meeting: id, title, team: importTeams.includes(rawTeam) ? rawTeam : "전체", owner, due, status, notes: [note, rawDue && !due ? `원본 기한: ${rawDue}` : "", rawTeam && !importTeams.includes(rawTeam) && rawTeam !== "전체" ? `원본 분과: ${rawTeam}` : ""].filter(Boolean).join("\n") } });
  }
  const records = [meeting, ...reports, ...tasks];
  if (new TextEncoder().encode(JSON.stringify({ format: "wyd-collaboration-v1", records })).length > 650 * 1024) throw Error("회의록 내용이 너무 깁니다. 내용을 나누어 가져와 주세요.");
  return { fileName, records, warnings: [...new Set(warnings)] };
}
