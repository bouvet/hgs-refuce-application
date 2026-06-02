import { SuperAdminGuard } from "@/components/auth/superadmin-guard";
import { SuperAdminContent } from "@/components/admin/superadmin-content";

export default function SuperAdminPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminContent />
    </SuperAdminGuard>
  );
}
