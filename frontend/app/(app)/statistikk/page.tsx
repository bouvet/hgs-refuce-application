import { StatisticsContent } from "@/components/stats/statistics-content";
import { requireRole } from "@/lib/server-session";

export default async function StatistikkPage() {
  await requireRole(["admin", "superadmin"]);
  return (
    <div className="flex flex-col gap-6">
      <StatisticsContent />
    </div>
  );
}
