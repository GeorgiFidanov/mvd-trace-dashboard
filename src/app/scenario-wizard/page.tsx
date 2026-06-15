import { AppShell } from "@/components/AppShell";
import { ScenarioWizardClient } from "@/components/ScenarioWizardClient";
import { CORE_DEMO_USE_CASE_ID } from "@/lib/coreDemo";

export default async function ScenarioWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ useCase?: string; step?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell>
      <ScenarioWizardClient
        initialUseCase={params.useCase ?? CORE_DEMO_USE_CASE_ID}
        initialStepId={params.step}
      />
    </AppShell>
  );
}
