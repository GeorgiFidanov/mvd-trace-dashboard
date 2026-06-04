import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default function AdvancedDiagnosticsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-100">Advanced Diagnostics</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Technical traces and protocol payloads</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-50/80">
            This area is intentionally technical. It exposes trace timelines, raw requests, raw responses, protocol
            payloads, extracted IDs, and sequence views for evaluators and developers.
          </p>
        </header>
        <DashboardClient view="traces" />
      </div>
    </AppShell>
  );
}
