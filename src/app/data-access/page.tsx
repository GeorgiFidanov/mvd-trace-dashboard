import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function DataAccessPage() {
  return (
    <AppShell>
      <DashboardClient view="data" />
    </AppShell>
  );
}
