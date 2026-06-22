import { DashboardContent } from "@/components/stats/dashboard-content";
import { requireRole } from "@/lib/server-session";

export default async function OversiktPage() {
  await requireRole(["admin", "superadmin"]);
  return (
    <div className="flex flex-col gap-4">
      <DashboardContent />
    </div>
  );
}
