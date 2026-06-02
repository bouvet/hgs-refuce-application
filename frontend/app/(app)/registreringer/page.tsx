import { RegistrationsTableNoSSR as RegistrationsTable } from "@/components/stats/registrations-table-no-ssr";

export default function RegistreringerPage() {
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
