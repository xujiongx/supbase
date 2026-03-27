/** 本地日期的 YYYY-MM-DD，用于看板格子主键 */
export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateKeyFromISO(iso: string): string {
  return formatDateKey(new Date(iso));
}

/** 周一为一周起始（与中国常见习惯一致） */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** 看板插入用：落在该日本地正午，便于按日归类且不与时区边界打架 */
export function boardDayNoonISO(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  return x.toISOString();
}

export function weekRangeBounds(days: Date[]): { start: Date; end: Date } {
  const start = new Date(days[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(days[days.length - 1]);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getWeekDays(anchor: Date): Date[] {
  const s = startOfWeekMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export type MonthCell = { date: Date; inMonth: boolean };

/** 固定 6×7=42 格，与常见月历对齐；非本月日期 inMonth=false */
export function getMonthGridCells(year: number, monthIndex: number): MonthCell[] {
  const first = new Date(year, monthIndex, 1);
  const start = startOfWeekMonday(first);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i);
    return { date: d, inMonth: d.getMonth() === monthIndex };
  });
}

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function getWeekdayLabels(): string[] {
  return WEEK_LABELS;
}
