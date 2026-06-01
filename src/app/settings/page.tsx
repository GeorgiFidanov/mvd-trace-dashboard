import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function SettingsPage() {
  return (
    <AppShell>
      <DashboardClient view="settings" />
    </AppShell>
  );
}
