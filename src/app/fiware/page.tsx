import { AppShell } from "@/components/AppShell";
import Link from "next/link";

export default function FiwarePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">FIWARE Data Space</p>
          <h1 className="mt-3 text-3xl font-bold text-white">FIWARE scenario track</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            This track is reserved for FIWARE-oriented validation scenarios such as NGSI-LD discovery, marketplace
            onboarding, credential presentation, and data service access. The current runnable demonstrator is the EDC
            track.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/use-cases" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
              Open EDC Scenarios
            </Link>
            <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">
              Back to Platform Choice
            </Link>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {[
            ["Trust", "Identity and credential validation through FIWARE-aligned trust services."],
            ["Discovery", "Catalog and marketplace discovery for FIWARE data products."],
            ["Policy", "Usage conditions and access decisions for protected resources."],
            ["Data Access", "Retrieval of validated data services through the selected connector path."],
          ].map(([title, text]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
