"use client";

import type { TraceEvent } from "@/lib/types";
import { JsonBlock } from "./JsonBlock";

export function TraceTimeline({ events }: { events: TraceEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-slate-500">No trace events yet. Run a step to start recording.</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <details key={event.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-950">{event.stepName}</div>
                <div className="break-all text-xs text-slate-500">
                  {event.method} {event.url}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={badgeClass(event.status)}>{event.status}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">{event.responseStatus ?? "no status"}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1">{event.durationMs ?? 0} ms</span>
              </div>
            </div>
          </summary>
          <div className="mt-4 grid gap-4 2xl:grid-cols-2">
            <JsonBlock title="Request" value={{ headers: event.requestHeadersRedacted, body: event.requestBody }} />
            <JsonBlock title="Response" value={{ status: event.responseStatus, body: event.responseBody, ids: event.extractedIds }} />
          </div>
          {event.errorMessage ? <p className="mt-3 text-sm text-red-600">{event.errorMessage}</p> : null}
        </details>
      ))}
    </div>
  );
}

export function SequenceView({ events }: { events: TraceEvent[] }) {
  if (!events.length) return <p className="text-sm text-slate-500">The sequence view is generated from trace events.</p>;

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid min-w-[720px] gap-3">
        {events.map((event) => (
          <div key={event.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
            <div className="rounded-md bg-slate-100 px-3 py-2 text-right font-medium">{event.actor}</div>
            <div className="text-center text-xs text-slate-500">
              <div>{event.method}</div>
              <div className="h-px w-24 bg-slate-300" />
              <div>{event.stepName}</div>
            </div>
            <div className="rounded-md bg-blue-50 px-3 py-2 font-medium text-blue-900">{event.target}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function badgeClass(status: TraceEvent["status"]) {
  if (status === "success") return "rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700";
  if (status === "error") return "rounded-full bg-red-100 px-2 py-1 font-medium text-red-700";
  return "rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700";
}
