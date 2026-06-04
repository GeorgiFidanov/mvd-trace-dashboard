import Link from "next/link";
import { useCases } from "@/lib/useCases";
import { StatusBadge } from "./StatusBadge";

export function UseCaseCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-4 lg:grid-cols-3" : "grid gap-5 xl:grid-cols-3"}>
      {useCases.map((useCase) => (
        <article
          key={useCase.id}
          className="group relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.09]"
        >
          <Link href={useCase.primaryRoute} className="absolute inset-0 rounded-3xl" aria-label={`Open ${useCase.title}`} />
          <div className="pointer-events-none flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">{useCase.id}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{useCase.shortTitle}</h2>
            </div>
            <StatusBadge status={useCase.status} />
          </div>
          <p className="pointer-events-none mt-4 text-sm leading-6 text-slate-300">{useCase.description}</p>
          <div className="pointer-events-none mt-4 rounded-2xl bg-slate-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Success Criteria</p>
            <p className="mt-2 text-sm text-slate-200">{useCase.successCriteria}</p>
          </div>
          <div className="relative z-10 mt-5 flex flex-wrap gap-2">
            <Link
              href={useCase.primaryRoute}
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Run Scenario
            </Link>
            <Link
              href={`/execution-history?useCase=${useCase.id}`}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              View Results
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
