import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function TransferPage() {
  return (
    <AppShell>
      <DashboardClient view="transfer" />
    </AppShell>
  );
}
