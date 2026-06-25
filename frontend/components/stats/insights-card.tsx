import { TrendingUp, Check, Sparkles, Lock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { CategoryTotal } from "@/hooks/use-dashboard-data";
import type { Report } from "@/lib/types";

type InsightsCardProps = {
  anomaly: CategoryTotal | undefined;
  submittedReport: Report | undefined;
};

export function InsightsCard({ anomaly, submittedReport }: InsightsCardProps) {
  return (
    <Card size="sm" className="rounded-2xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Innsikt
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {anomaly ? (
          <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingUp className="size-4 text-amber-600" />
            </div>
            <div className="text-[12.5px] leading-snug">
              <div className="font-semibold text-foreground">
                {anomaly.cat.label} er høyere enn vanlig
              </div>
              <div className="text-muted-foreground mt-0.5">
                {anomaly.delta?.toFixed(0)}% over forrige kvartal.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2.5 p-3 rounded-xl bg-secondary/60">
            <Check className="size-4 text-primary mt-0.5 shrink-0" />
            <span className="text-[12.5px]">
              Ingen uvanlige mønstre dette kvartalet.
            </span>
          </div>
        )}
        <div className="flex gap-2.5 p-3 rounded-xl bg-muted border border-border">
          <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
          <div className="text-[12.5px]">
            <div className="font-semibold">Matavfall sortert stabilt</div>
            <div className="text-muted-foreground mt-0.5">
              Ingen sprang på over 10% hittil i år.
            </div>
          </div>
        </div>
        {submittedReport === undefined && (
          <div className="flex gap-2.5 p-3 rounded-xl bg-muted border border-border">
            <Lock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-[12.5px] text-muted-foreground">
              Husk å sende kvartalsrapport.{" "}
              <a
                href="/rapportering"
                className="text-primary font-medium hover:underline"
              >
                Gå til rapportering →
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
