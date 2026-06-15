import { AppShell } from "@/components/AppShell";
import { ProcessVisualizationClient } from "@/components/ProcessVisualizationClient";

export default function UseCasesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Use Cases</p>
          <h1 className="mt-2 text-3xl font-bold text-white">EDC MVD-focused validation scenarios</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Each use case is expressed in business terms first. The underlying EDC catalog, negotiation, policy, transfer,
            and data access calls are still recorded for technical review.
          </p>
        </header>
        <ProcessVisualizationClient showProcessMap={false} />
      </div>
    </AppShell>
  );
}
