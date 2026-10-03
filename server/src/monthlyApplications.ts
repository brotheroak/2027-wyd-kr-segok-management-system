export type MonthlyApplicationCount = {
  month: string;
  total: number;
  active: number;
  canceled: number;
};

// Aggregate original registration dates in Korea, independently of list filters.
export function monthlyApplicationCounts(records: { createdAt: string; status: string }[]): MonthlyApplicationCount[] {
  const counts = new Map<string, MonthlyApplicationCount>();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" });
  for (const record of records) {
    const date = new Date(record.createdAt);
    if (!Number.isFinite(date.getTime())) continue;
    const parts = formatter.formatToParts(date);
    const month = `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`;
    const count = counts.get(month) ?? { month, total: 0, active: 0, canceled: 0 };
    count.total++;
    if (record.status === "canceled") count.canceled++; else count.active++;
    counts.set(month, count);
  }
  return [...counts.values()].sort((a, b) => a.month.localeCompare(b.month));
}
