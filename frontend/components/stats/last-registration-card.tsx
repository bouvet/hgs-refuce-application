import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

type LastRegistrationCardProps = {
  lastAgo: number | null;
  lastRegDate: string | undefined;
};

export function LastRegistrationCard({
  lastAgo,
  lastRegDate,
}: LastRegistrationCardProps) {
  return (
    <Card size="sm" className="rounded-2xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Siste registrering
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`text-3xl font-bold leading-none ${
              lastAgo !== null && lastAgo > 3
                ? "text-amber-600"
                : "text-foreground"
            }`}
          >
            {lastAgo === 0
              ? "I dag"
              : lastAgo === 1
                ? "I går"
                : lastAgo !== null
                  ? `${lastAgo}d siden`
                  : "–"}
          </span>
        </div>
        {lastRegDate && (
          <div className="text-xs text-muted-foreground mt-1.5">
            {new Date(lastRegDate).toLocaleDateString("nb-NO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        )}
        {lastAgo !== null && lastAgo > 3 && (
          <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-amber-600">
            <AlertTriangle className="size-3.5" /> Data kan være foreldet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
