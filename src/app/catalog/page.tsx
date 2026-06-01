import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function CatalogPage() {
  return (
    <AppShell>
      <DashboardClient view="catalog" />
    </AppShell>
  );
}
