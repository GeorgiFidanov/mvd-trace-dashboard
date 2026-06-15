"use client";

import type { TraceEvent } from "@/lib/types";
import { type TraceDiagnosis } from "@/lib/traceDiagnosis";
import { JsonBlock } from "./JsonBlock";

export function TraceTimeline({ events }: { events: TraceEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-slate-400">No trace events yet. Run a step to start recording.</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <details key={event.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-white">{event.stepName}</div>
                <div className="break-all text-xs text-slate-400">
                  {event.method} {event.url}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={badgeClass(event.status)}>{eventLabel(event)}</span>
                <span className={statusCodeClass(event)}>{event.responseStatus ?? "no status"}</span>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">{event.durationMs ?? 0} ms</span>
              </div>
            </div>
          </summary>
          <div className="mt-4 grid gap-4 2xl:grid-cols-2">
            <JsonBlock title="Request" value={{ headers: event.requestHeadersRedacted, body: event.requestBody }} />
            <JsonBlock title="Response" value={{ status: event.responseStatus, body: event.responseBody, ids: event.extractedIds }} />
          </div>
          {event.errorMessage ? (
            <p className={`mt-3 text-sm ${event.status === "pending" ? "text-amber-200" : "text-red-300"}`}>{event.errorMessage}</p>
          ) : null}
        </details>
      ))}
    </div>
  );
}

export function TraceDiagnosisPanel({ diagnosis, compact = false }: { diagnosis: TraceDiagnosis | null; compact?: boolean }) {
  if (!diagnosis) return null;

  return (
    <div className={`rounded-2xl border border-red-300/20 bg-red-300/10 ${compact ? "mt-4 p-4" : "p-5"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-200">Likely root cause</p>
      <h3 className="mt-2 text-lg font-bold text-white">{diagnosis.title}</h3>
      <p className="mt-2 text-sm leading-6 text-red-50">{diagnosis.summary}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-200">Evidence from trace</p>
          <ul className="mt-2 grid gap-2 text-sm text-slate-200">
            {diagnosis.evidence.map((item, index) => (
              <li key={`evidence-${index}`} className="grid grid-cols-[auto_1fr] gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-200" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-200">What to check next</p>
          <ul className="mt-2 grid gap-2 text-sm text-slate-200">
            {diagnosis.nextSteps.map((item, index) => (
              <li key={`next-step-${index}`} className="grid grid-cols-[auto_1fr] gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-200" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SequenceView({ events }: { events: TraceEvent[] }) {
  if (!events.length) return <p className="text-sm text-slate-400">The sequence view is generated from trace events.</p>;

  return (
    <div className="overflow-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="mb-4 grid min-w-[840px] grid-cols-3 gap-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        <div>Actor</div>
        <div>Exchange</div>
        <div>Target</div>
      </div>
      <div className="grid min-w-[840px] gap-3">
        {events.map((event) => (
          <div key={event.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-right font-semibold text-cyan-100">
              {event.actor}
            </div>
            <div className="text-center text-xs text-slate-400">
              <div className="mx-auto mb-1 w-fit rounded-full bg-slate-800 px-2 py-1 font-semibold text-slate-200">
                {event.method} · {event.responseStatus ?? "no status"}
              </div>
              <div className="h-px w-32 bg-pink-300/40" />
              <div className="mt-1 font-semibold text-pink-100">{event.stepName}</div>
              <div className="text-slate-500">{event.durationMs ?? 0} ms</div>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 font-semibold text-emerald-100">
              {event.target}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function badgeClass(status: TraceEvent["status"]) {
  if (status === "success") return "rounded-full bg-emerald-400/15 px-2 py-1 font-medium text-emerald-100";
  if (status === "error") return "rounded-full bg-red-400/15 px-2 py-1 font-medium text-red-100";
  return "rounded-full bg-amber-400/15 px-2 py-1 font-medium text-amber-100";
}

function eventLabel(event: TraceEvent) {
  if (event.status === "pending") return "waiting";
  return event.status;
}

function statusCodeClass(event: TraceEvent) {
  const base = "rounded-full px-2 py-1 ";
  if (event.status === "pending") return `${base}bg-amber-400/15 text-amber-100`;
  if (event.status === "error") return `${base}bg-red-400/15 text-red-100`;
  return `${base}bg-slate-800 text-slate-200`;
}
