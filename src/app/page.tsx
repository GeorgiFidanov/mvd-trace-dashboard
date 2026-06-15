import { AppShell } from "@/components/AppShell";
import Link from "next/link";

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl py-4">
        <section className="w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-pink-400/20 via-slate-900 to-cyan-500/20 p-10 xl:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Dataspace Platform Choice</p>
          <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-tight text-white xl:text-6xl">Choose a dataspace platform</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Select the track you want to present or validate. Scenario details appear after choosing a platform.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <PlatformCard
              title="FIWARE Data Space"
              label="FIWARE"
              href="/fiware"
              accent="orange"
              description="Explore the FIWARE-oriented path for NGSI-LD, marketplace, and trust framework validation."
              meta="Preparation track"
            />
            <PlatformCard
              title="EDC MVD"
              label="EDC"
              href="/use-cases"
              accent="cyan"
              description="Run EDC MVD scenarios for catalog discovery, identity, policy, contract negotiation, transfer, and data access."
              meta="Available now"
            />
          </div>
        </section>
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
    <Link href={href} className={`group block rounded-3xl border ${color} bg-slate-950/60 p-8 transition hover:-translate-y-1 hover:bg-white/10`}>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${badge}`}>{label}</span>
      <h2 className="mt-5 text-3xl font-bold text-white">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-300">{description}</p>
      <p className={`mt-5 text-sm font-semibold ${action}`}>{meta} →</p>
    </Link>
  );
}
