import { AppShell } from "@/components/AppShell";
import { UseCaseCards } from "@/components/UseCaseCards";
import Link from "next/link";

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-slate-900 to-indigo-500/20 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Dataspace Use-Case Validation</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-white">
            Choose a dataspace platform and validate scenarios step by step.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
            Explore discovery, identity, policy enforcement, transfer, and interoperability findings through guided
            educational workflows.
          </p>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <PlatformCard
              title="FIWARE Data Space"
              label="FIWARE"
              href="/fiware"
              accent="orange"
              description="Explore the FIWARE-oriented path for NGSI-LD, marketplace, and trust framework validation."
              meta="Preparation track"
            />
            <PlatformCard
              title="Eclipse Dataspace Components"
              label="EDC"
              href="/use-cases"
              accent="cyan"
              description="Run Eclipse EDC scenarios for catalog discovery, identity, policy, contract negotiation, transfer, and data access."
              meta="Available now"
            />
          </div>
        </section>
        <UseCaseCards />
      </div>
    </AppShell>
  );
}

function PlatformCard({
  title,
  label,
  href,
  accent,
  description,
  meta,
}: {
  title: string;
  label: string;
  href: string;
  accent: "cyan" | "orange";
  description: string;
  meta: string;
}) {
  const color = accent === "cyan" ? "border-cyan-300/30 hover:border-cyan-200" : "border-orange-300/30 hover:border-orange-200";
  const badge = accent === "cyan" ? "bg-cyan-300/15 text-cyan-100" : "bg-orange-300/15 text-orange-100";
  const action = accent === "cyan" ? "text-cyan-100" : "text-orange-100";

  return (
    <Link href={href} className={`group block rounded-3xl border ${color} bg-slate-950/60 p-6 transition hover:-translate-y-1 hover:bg-white/10`}>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badge}`}>{label}</span>
      <h2 className="mt-5 text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      <p className={`mt-5 text-sm font-semibold ${action}`}>{meta} →</p>
    </Link>
  );
}
