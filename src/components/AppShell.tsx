import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Overview", "/"],
  ["Use Cases", "/use-cases"],
  ["Scenario Wizard", "/scenario-wizard"],
  ["Execution History", "/execution-history"],
  ["Architecture", "/architecture"],
  ["Deployment Status", "/deployment-status"],
  ["Advanced Diagnostics", "/advanced-diagnostics"],
  ["Settings", "/settings"],
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950/95 p-5 backdrop-blur md:block">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">EDC Education</div>
        <h1 className="mt-3 text-2xl font-bold">Dataspace Validation Platform</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Guided use-case validation for Eclipse Dataspace Components, with technical traces available on demand.
        </p>
        <nav className="mt-8 grid gap-1">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-xs leading-5 text-cyan-100">
          Scenario mode explains what happened and why. Advanced Diagnostics keeps the EDC protocol details available for
          deeper review.
        </p>
      </aside>
      <main className="px-4 py-6 md:ml-72 md:px-8">{children}</main>
    </div>
  );
}
