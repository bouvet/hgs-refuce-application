"use client";

import { useDashboardData } from "@/hooks/use-dashboard-data";
import { quarterLabelLong } from "@/lib/quarters";
import { TotalHeroCard } from "@/components/stats/total-hero-card";
import { DeadlineCard } from "@/components/stats/deadline-card";
import { LastRegistrationCard } from "@/components/stats/last-registration-card";
import { CategoryBreakdownCard } from "@/components/stats/category-breakdown-card";
import { InsightsCard } from "@/components/stats/insights-card";
import { CalendarCard } from "@/components/stats/calendar-card";
import { DashboardSkeleton } from "@/components/stats/dashboard-skeleton";

export function DashboardContent() {
  const data = useDashboardData();

  if (data.isLoading) {
    return <DashboardSkeleton />;
  }

  if (data.registrations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Ingen registreringer ennå.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Oversikt</h1>
        <span className="text-sm text-muted-foreground">
          {quarterLabelLong(data.quarter)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <TotalHeroCard
          totalKg={data.totalThis}
          delta={data.delta}
          registrationCount={data.regsThisCount}
          prevQuarterTotal={data.prevQuarter !== null ? data.totalPrev : null}
          trendData={data.trendData}
        />
        <DeadlineCard
          submittedReport={data.submittedReport}
          daysLeft={data.daysLeft}
          pctThrough={data.pctThrough}
          qEnd={data.qEnd}
        />
        <LastRegistrationCard
          lastAgo={data.lastAgo}
          lastRegDate={data.lastReg?.date}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        <div className="md:col-span-3">
          <CategoryBreakdownCard
            catTotals={data.catTotals}
            totalForPct={data.totalForPct}
          />
        </div>
        <div className="md:col-span-2">
          <InsightsCard
            anomaly={data.anomaly}
            submittedReport={data.submittedReport}
          />
        </div>
      </div>

      <CalendarCard
        quarter={data.quarter}
        registrations={data.registrations}
        today={data.today}
      />
    </div>
  );
}
