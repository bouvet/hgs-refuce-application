import { SuperAdminContent } from "@/components/admin/superadmin-content";
import { requireRole } from "@/lib/server-session";

export default async function SuperAdminPage() {
  await requireRole("superadmin");
  return <SuperAdminContent />;
}
