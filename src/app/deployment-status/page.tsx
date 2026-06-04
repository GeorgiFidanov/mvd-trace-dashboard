import { AppShell } from "@/components/AppShell";
import { DeploymentStatusClient } from "@/components/DeploymentStatusClient";

export default function DeploymentStatusPage() {
  return (
    <AppShell>
      <DeploymentStatusClient />
    </AppShell>
  );
}
