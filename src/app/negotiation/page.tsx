import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function NegotiationPage() {
  return (
    <AppShell>
      <DashboardClient view="negotiation" />
    </AppShell>
  );
}
