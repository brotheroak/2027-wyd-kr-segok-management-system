import React, { useState } from "react";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./monthlyApplications.css";

type MonthCount = { month: string; total: number; active: number; canceled: number };
export function MonthlyApplicationsPanel({ counts = [], kind }: { counts?: MonthCount[]; kind: "homestay" | "volunteer" }) {
  const todayParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const currentYear = Number(todayParts.find(part => part.type === "year")!.value);
  const currentMonth = Number(todayParts.find(part => part.type === "month")!.value);
  const [year, setYear] = useState(currentYear);
  const years = [...new Set([currentYear, year, ...counts.map(item => Number(item.month.slice(0, 4)))])].sort((a, b) => b - a);
  const unit = kind === "homestay" ? "가정" : "명";
  const name = kind === "homestay" ? "홈스테이" : "자원봉사자";
  const index = new Map(counts.map(item => [item.month, item]));
  const rows = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const item = index.get(month) ?? { month, total: 0, active: 0, canceled: 0 };
    const previousMonth = i === 0 ? `${year - 1}-12` : `${year}-${String(i).padStart(2, "0")}`;
    const previous = index.get(previousMonth)?.total ?? 0;
    const future = year > currentYear || (year === currentYear && i + 1 > currentMonth);
    const change = item.total - previous;
    return { ...item, label: `${i + 1}월`, future, ongoing: year === currentYear && i + 1 === currentMonth, change, percent: previous > 0 ? `${change > 0 ? "+" : ""}${((change / previous) * 100).toFixed(1)}%` : item.total ? "비교 기준 없음" : "—" };
  });
  const totals = rows.reduce((sum, item) => ({ total: sum.total + item.total, active: sum.active + item.active, canceled: sum.canceled + item.canceled }), { total: 0, active: 0, canceled: 0 });
  const exportCsv = () => {
    const lines = [["월", `신규 신청 (${unit})`, "현재 유효", "현재 취소", "전월 대비 신청 증감", "전월 대비 증감률", "집계 상태"], ...rows.map(item => [item.month, item.total, item.active, item.canceled, item.future ? "" : item.change, item.future ? "" : item.percent, item.future ? "미도래" : item.ongoing ? "집계 중" : "완료"])];
    const blob = new Blob(["\ufeff" + lines.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `wyd-${kind}-monthly-${year}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="monthly-applications" aria-label={`${name} 월별 신청 통계`}>
    <div className="monthly-toolbar"><div><h3>월별 신규 신청 추이</h3><p>홍보 전후의 신청 흐름을 월별로 비교하세요.</p></div><div><label>연도 <select value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}년</option>)}</select></label><button className="secondary" onClick={exportCsv}><Download size={16} /> 통계 CSV</button></div></div>
    <div className="monthly-metrics"><div><span>{year}년 신규 신청</span><strong>{totals.total.toLocaleString()} <small>{unit}</small></strong></div><div><span>현재 유효 신청</span><strong>{totals.active.toLocaleString()} <small>{unit}</small></strong></div><div><span>현재 취소 신청</span><strong>{totals.canceled.toLocaleString()} <small>{unit}</small></strong></div></div>
    <div className="monthly-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar name="현재 유효" dataKey="active" stackId="applications" fill="#315ee8" /><Bar name="현재 취소" dataKey="canceled" stackId="applications" fill="#ccd4e2" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
    <p className="monthly-definition">최초 접수일 · 한국 시간 기준 · 목록 검색 및 상태 필터와 무관한 전체 신청 통계. {kind === "homestay" ? "가정별 신청 1건을 1가정으로 집계합니다." : "봉사자 신청 1건을 1명으로 집계합니다."} 취소 신청도 신규 접수에 포함하며, 유효·취소는 현재 상태입니다. 종이 신청은 시스템 등록일 기준입니다. 이번 달은 집계 중입니다.</p>
    <div className="monthly-table-wrap"><table><caption className="sr-only">{year}년 {name} 월별 신규 신청 통계</caption><thead><tr><th scope="col">월</th><th scope="col">신규 신청</th><th scope="col">현재 유효</th><th scope="col">현재 취소</th><th scope="col">전월 대비</th><th scope="col">증감률</th></tr></thead><tbody>{rows.map(item => <tr key={item.month}><th scope="row">{item.label}{item.ongoing && <small>집계 중</small>}{item.future && <small>미도래</small>}</th><td>{item.future ? "—" : item.total}</td><td>{item.future ? "—" : item.active}</td><td>{item.future ? "—" : item.canceled}</td><td>{item.future ? "—" : `${item.change > 0 ? "+" : ""}${item.change}`}</td><td>{item.future ? "—" : item.percent}</td></tr>)}</tbody></table></div>
  </section>;
}
