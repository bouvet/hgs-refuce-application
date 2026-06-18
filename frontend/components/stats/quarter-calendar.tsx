import { quarterToMonths } from "@/lib/quarters";
import type { WasteRegistration } from "@/lib/types";

const DOW_LABELS = ["M", "T", "O", "T", "F", "L", "S"];
const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAI",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

export function QuarterCalendar({
  quarter,
  registrations,
  today,
}: {
  quarter: string;
  registrations: WasteRegistration[];
  today: string;
}) {
  const months = quarterToMonths(quarter);

  const dailyKg = new Map<string, number>();
  for (const reg of registrations) {
    const kg = reg.entries.reduce((s, e) => s + e.weightKg, 0);
    dailyKg.set(reg.date, (dailyKg.get(reg.date) ?? 0) + kg);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {months.map((month) => {
        const [y, m] = month.split("-").map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        const cells: (number | null)[] = [
          ...Array(firstDow).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];

        return (
          <div key={month}>
            <div className="text-[10.5px] font-bold text-foreground uppercase tracking-[0.5px] text-center mb-1.5">
              {MONTH_LABELS[m - 1]}
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DOW_LABELS.map((d, i) => (
                <div
                  key={i}
                  className="text-[9px] font-semibold text-muted-foreground text-center py-0.5"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const kg = dailyKg.get(dateStr) ?? 0;
                const isToday = dateStr === today;
                const isFuture = dateStr > today;
                const hasData = kg > 0;

                const intensity = hasData ? Math.min(kg / 25, 1) : 0;
                const bgOpacity = hasData ? 0.15 + intensity * 0.55 : undefined;
                const cellBg = hasData
                  ? `rgba(62,122,58,${bgOpacity!.toFixed(2)})`
                  : undefined;
                const cellColor = hasData
                  ? intensity > 0.5
                    ? "#ffffff"
                    : "#33251a"
                  : undefined;

                return (
                  <div
                    key={dateStr}
                    title={
                      hasData ? `${dateStr}: ${kg.toFixed(1)} kg` : dateStr
                    }
                    style={{
                      height: 22,
                      borderRadius: 5,
                      fontSize: "9.5px",
                      fontWeight: 600,
                      background: cellBg,
                      color: cellColor,
                      opacity: isFuture ? 0.4 : 1,
                      outline: isToday
                        ? "1.5px solid var(--primary)"
                        : undefined,
                      outlineOffset: isToday ? "-1px" : undefined,
                      fontVariantNumeric: "tabular-nums",
                    }}
                    className={`flex items-center justify-center border ${
                      hasData ? "border-transparent" : "border-border"
                    } ${!hasData && !isFuture ? "bg-background" : ""} ${
                      isFuture && !hasData ? "bg-transparent" : ""
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
