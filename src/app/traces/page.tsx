import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function TracesPage() {
  return (
    <AppShell>
      <DashboardClient view="traces" />
    </AppShell>
  );
}
