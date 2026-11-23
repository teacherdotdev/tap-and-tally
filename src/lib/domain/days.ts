/** The teacher's own calendar day, "YYYY-MM-DD", which counts and toggles cover. */
export function dayKey(when: Date | number = new Date()): string {
  const date = new Date(when);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type Range = "today" | "week" | "month" | "all";

export const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

/** The first moment of a Range. Weeks start on Monday. */
export function rangeStart(range: Range, now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "all") return 0;
  if (range === "week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (range === "month") start.setDate(1);
  return start.getTime();
}

export type CalendarRange = { start: string; end: string };

export function readCalendarRange(
  params: URLSearchParams,
): CalendarRange | null {
  const start = params.get("start");
  const end = params.get("end");
  if (!start || !end || !validDay(start) || !validDay(end) || start > end)
    return null;
  return { start, end };
}

function validDay(key: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    !key.startsWith("0000") &&
    dayKey(new Date(key + "T12:00:00")) === key
  );
}
