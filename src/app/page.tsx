import { AppShell } from "@/components/AppShell";
import { coreDemoStages } from "@/lib/coreDemo";
import Link from "next/link";

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8 py-4">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-pink-400/20 via-slate-900 to-cyan-500/20 p-10 xl:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Pink Panther · Dataspace Playground</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-tight text-white xl:text-6xl">
            Learn data sharing by clicking through the Core Demo
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Built for non-technical onboarding and Show & Tell rehearsals. Walk the five DS4SSCC playbook steps live,
            pick catalog assets, rename participants for your story, and keep technical evidence one click away.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/scenario-wizard"
              className="rounded-2xl bg-pink-300 px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-pink-200"
            >
              Open Core Demo Playground
            </Link>
            <Link
              href="/use-cases"
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-100 transition hover:bg-white/10"
            >
              Technical validation scenarios
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          {coreDemoStages.map((stage) => (
            <Link
              key={stage.id}
              href={`/scenario-wizard?useCase=UC-CORE&step=${stage.wizardStepId}`}
              className="group rounded-3xl border border-white/10 bg-slate-900/80 p-5 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.06]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-lg font-black text-cyan-100">
                {stage.stage}
              </span>
              <h2 className="mt-4 text-lg font-bold text-white group-hover:text-cyan-100">{stage.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{stage.whatUserSees}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-pink-200">Try this step →</p>
            </Link>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Who is this for?</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm leading-7 text-slate-300">
            <p>
              <strong className="text-white">Newcomers</strong> — explore how onboarding, catalog, access, and data use fit
              together without reading connector logs first.
            </p>
            <p>
              <strong className="text-white">Show & Tell presenters</strong> — rehearse Section 2 of the DS4SSCC playbook with
              the same five steps your stakeholders expect.
            </p>
            <p>
              <strong className="text-white">Technical leads</strong> — switch to EDC MVD validation scenarios when you need
              deeper protocol checks; traces land in Execution History either way.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
