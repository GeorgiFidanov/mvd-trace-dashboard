import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function AdvancedDiagnosticsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardClient view="traces" />
      </div>
    </AppShell>
  );
}
