import { AppShell } from "@/components/AppShell";
import { ExecutionHistoryClient } from "@/components/ExecutionHistoryClient";

export default async function ExecutionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ useCase?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell>
      <ExecutionHistoryClient initialUseCase={params.useCase ?? "all"} />
    </AppShell>
  );
}
