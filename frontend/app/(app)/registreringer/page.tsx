import { RegistrationsTableNoSSR as RegistrationsTable } from "@/components/stats/registrations-table-no-ssr";
import { requireRole } from "@/lib/server-session";

export default async function RegistreringerPage() {
  await requireRole(["admin", "superadmin"]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl md:text-2xl font-semibold">Registreringer</h1>
        <p className="text-sm text-muted-foreground">Alle registreringer</p>
      </div>
      <RegistrationsTable />
    </div>
  );
}
