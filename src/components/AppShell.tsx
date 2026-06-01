import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Overview", "/"],
  ["Catalog", "/catalog"],
  ["Negotiation", "/negotiation"],
  ["Transfer", "/transfer"],
  ["Data Access", "/data-access"],
  ["Traces", "/traces"],
  ["Settings", "/settings"],
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 md:block">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">MVD Trace</div>
        <h1 className="mt-3 text-2xl font-bold">EDC Flow Dashboard</h1>
        <nav className="mt-8 grid gap-1">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 text-xs leading-5 text-slate-500">
          Traces the MVD catalog, negotiation, transfer, EDR, and data fetch calls through a local BFF.
        </p>
      </aside>
      <main className="px-4 py-6 md:ml-64 md:px-8">{children}</main>
    </div>
  );
}
