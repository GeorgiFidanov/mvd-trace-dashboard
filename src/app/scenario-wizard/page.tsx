import { AppShell } from "@/components/AppShell";
import { ScenarioWizardClient } from "@/components/ScenarioWizardClient";

export default async function ScenarioWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ useCase?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell>
      <ScenarioWizardClient initialUseCase={params.useCase ?? "UC-E5"} />
    </AppShell>
  );
}
