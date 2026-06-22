import { RapporteringContent } from "@/components/admin/rapportering-content"
import { requireRole } from "@/lib/server-session"

export default async function RapporteringPage() {
  await requireRole(["admin", "superadmin"])
  return <RapporteringContent />
}
