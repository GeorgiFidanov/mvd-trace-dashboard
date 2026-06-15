import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PinkPantherMark } from "@/components/PinkPantherMark";

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center">
        <section className="w-full overflow-hidden rounded-[2.5rem] border border-pink-300/20 bg-gradient-to-br from-pink-500/20 via-slate-900 to-cyan-400/10 p-10 shadow-2xl shadow-pink-950/20">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-pink-200">Pink Panther · 404</p>
              <h1 className="mt-4 text-5xl font-black tracking-tight text-white">This route slipped out of the dataspace.</h1>
              <p className="mt-5 text-base leading-7 text-slate-300">
                The dashboard could not find this page. Choose a valid platform track, inspect the architecture, or open
                diagnostics to continue your validation flow.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/" className="rounded-xl bg-pink-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-pink-200">
                  Back to platform choice
                </Link>
                <Link
                  href="/use-cases"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-white/10"
                >
                  Open EDC scenarios
                </Link>
                <Link
                  href="/architecture"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-white/10"
                >
                  View architecture
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
              <PinkPantherMark className="h-32 w-32" />
              <p className="mt-4 text-center text-sm font-semibold text-pink-100">No route matched</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
