import { AppShell } from "@/components/AppShell";

const components = [
  ["Dashboard", "Guided UI for scenario execution and education."],
  ["Dashboard API", "Next.js server-side API layer that calls EDC services and records traces."],
  ["Consumer Control Plane", "Discovers catalogs, negotiates contracts, and starts transfers."],
  ["Consumer Data Plane", "Retrieves EDR/dataflow metadata and accesses protected data."],
  ["Provider Control Plane", "Publishes assets, policies, contract offers, and DSP endpoints."],
  ["Provider Data Plane", "Hosts or proxies the provider data made available through agreements."],
  ["IdentityHub", "Participant identity, DID, DCP, and credential interaction point."],
  ["Vault", "Stores connector secrets such as STS client secrets and API credentials."],
  ["PostgreSQL", "Persistence for EDC runtime state in Kubernetes deployments."],
  ["Traefik", "Ingress and local routing layer for participant services."],
];

export default function ArchitecturePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Architecture</p>
          <h1 className="mt-2 text-3xl font-bold text-white">How the demonstrator connects to EDC</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            The dashboard stays outside the MVD runtime. It validates scenarios through public participant APIs and stores
            educational traces locally for replay and evaluation.
          </p>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="grid gap-4 text-center text-sm font-semibold text-slate-100">
            <div className="mx-auto rounded-2xl bg-cyan-300 px-5 py-3 text-slate-950">Dashboard</div>
            <div className="text-cyan-200">↓</div>
            <div className="mx-auto rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3">Dashboard API</div>
            <div className="text-cyan-200">↓</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-blue-300/20 bg-blue-300/10 p-5">
                <h2 className="text-lg">Consumer Participant</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl bg-slate-950/60 p-3">Consumer Control Plane</div>
                  <div className="rounded-xl bg-slate-950/60 p-3">Consumer Data Plane</div>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                <h2 className="text-lg">Provider Participant</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl bg-slate-950/60 p-3">Provider Control Plane</div>
                  <div className="rounded-xl bg-slate-950/60 p-3">Provider Data Plane</div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {["IdentityHub", "Vault", "PostgreSQL", "Traefik"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {components.map(([name, description]) => (
            <article key={name} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="text-lg font-semibold text-white">{name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
