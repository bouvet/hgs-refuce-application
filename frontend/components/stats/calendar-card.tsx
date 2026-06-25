import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { QuarterCalendar } from "@/components/stats/quarter-calendar";
import { quarterLabelLong } from "@/lib/quarters";
import type { WasteRegistration } from "@/lib/types";

type CalendarCardProps = {
  quarter: string;
  registrations: WasteRegistration[];
  today: string;
};

export function CalendarCard({
  quarter,
  registrations,
  today,
}: CalendarCardProps) {
  return (
    <Card size="sm" className="rounded-2xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Registreringer — {quarterLabelLong(quarter)}
        </CardTitle>
        <CardAction>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-[3px] inline-block"
                style={{ background: "rgba(62,122,58,0.7)" }}
              />
              Registrert
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[3px] inline-block bg-muted border border-border" />
              Ingen data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[3px] inline-block bg-muted/40 border border-border" />
              Fremtidig
            </span>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <QuarterCalendar
          quarter={quarter}
          registrations={registrations}
          today={today}
        />
      </CardContent>
    </Card>
  );
}
