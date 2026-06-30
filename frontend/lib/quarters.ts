// Shared quarterly period utilities.
// Period IDs use the format "YYYY-Qn" e.g. "2026-Q1", "2026-Q2"

export function dateToQuarter(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const q = Math.ceil(m / 3);
  return `${y}-Q${q}`;
}

export function quarterToMonths(quarter: string): string[] {
  const [y, qStr] = quarter.split("-");
  const q = parseInt(qStr.slice(1));
  const startMonth = (q - 1) * 3 + 1;
  const months: string[] = [];
  for (let i = 0; i < 3; i++) {
    months.push(`${y}-${String(startMonth + i).padStart(2, "0")}`);
  }
  return months;
}

export function quarterLabel(quarter: string): string {
  const [y, qStr] = quarter.split("-");
  return `${qStr} ${y}`;
}

/** Year component of a period, e.g. "2026-Q1" -> 2026 */
export function quarterYear(quarter: string): number {
  return Number(quarter.split("-")[0]);
}

/** Long label: "Q2 2026 · apr–jun" */
export function quarterLabelLong(quarter: string): string {
  const [y, qStr] = quarter.split("-");
  const q = parseInt(qStr.slice(1));
  const ranges = ["jan–mar", "apr–jun", "jul–sep", "okt–des"];
  return `${qStr} ${y} · ${ranges[q - 1]}`;
}

/** Return the last date of a quarter, e.g. "2026-Q1" => "2026-03-31" */
export function quarterEndDate(quarter: string): string {
  const [y, qStr] = quarter.split("-");
  const q = parseInt(qStr.slice(1));
  const endMonth = q * 3;
  const lastDay = new Date(Number(y), endMonth, 0).getDate();
  return `${y}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** Return the first date of a quarter */
export function quarterStartDate(quarter: string): string {
  const [y, qStr] = quarter.split("-");
  const q = parseInt(qStr.slice(1));
  const startMonth = (q - 1) * 3 + 1;
  return `${y}-${String(startMonth).padStart(2, "0")}-01`;
}

/** Days remaining until quarter end from today */
export function daysLeftInQuarter(quarter: string): number {
  const end = new Date(quarterEndDate(quarter));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000));
}

/** Current quarter in "YYYY-Qn" format */
export function getCurrentQuarter(): string {
  return dateToQuarter(new Date().toISOString().slice(0, 10));
}

/** Get past N quarters in descending order */
export function getPastQuarters(n: number): string[] {
  const now = new Date();
  const quarters: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i * 3);
    quarters.push(dateToQuarter(d.toISOString().slice(0, 10)));
  }
  // deduplicate preserving order
  return [...new Set(quarters)];
}

/** Total days in a quarter */
export function daysInQuarter(quarter: string): number {
  const start = new Date(quarterStartDate(quarter));
  const end = new Date(quarterEndDate(quarter));
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}
