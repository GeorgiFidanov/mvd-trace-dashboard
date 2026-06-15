import { AppShell } from "@/components/AppShell";
import { ProcessVisualizationClient } from "@/components/ProcessVisualizationClient";
import Link from "next/link";

export default function UseCasesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-pink-300/25 bg-gradient-to-br from-pink-300/10 via-slate-900 to-cyan-300/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-200">Main demo flow</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Start with the Core Demo Playground</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Non-technical audiences and Show & Tell sessions should use the five-step Core Demo first. The scenarios below
            are for deeper EDC MVD validation when you need to isolate identity, policy, federation, or interoperability
            findings.
          </p>
          <Link
            href="/scenario-wizard"
            className="mt-5 inline-flex rounded-xl bg-pink-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-pink-200"
          >
            Open Core Demo Playground
          </Link>
        </header>
        <ProcessVisualizationClient showProcessMap={false} technicalOnly />
      </div>
    </AppShell>
  );
}
