"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trace, TraceEvent } from "@/lib/types";
import { useCases } from "@/lib/useCases";
import { StatusBadge } from "./StatusBadge";

export function ExecutionHistoryClient({ initialUseCase = "all" }: { initialUseCase?: string }) {
  const [traces, setTraces] = useState<(Trace & { events?: TraceEvent[] })[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [useCase, setUseCase] = useState(initialUseCase);

  useEffect(() => {
    void fetch("/api/traces", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setTraces(data.traces ?? []));
  }, []);

  async function refreshTraces() {
    const response = await fetch("/api/traces", { cache: "no-store" });
    const data = await response.json();
    setTraces(data.traces ?? []);
  }

  async function deleteTrace(id: string) {
    await fetch(`/api/traces?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshTraces();
  }

  async function clearRunning() {
    await fetch("/api/traces?status=running", { method: "DELETE" });
    await refreshTraces();
  }

  const records = useMemo(
    () =>
      traces.map((trace) => {
        const events = trace.events ?? [];
        const duration = events.reduce((sum, event) => sum + (event.durationMs ?? 0), 0);
        const useCaseId = trace.useCaseId ?? inferUseCaseId(events);
        const details = useCases.find((item) => item.id === useCaseId);
        return {
          trace,
          useCaseId,
          useCase: details ? `${details.id} ${details.shortTitle}` : "Unclassified Execution",
          environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? "local",
          duration,
        };
      }),
    [traces],
  );

  const filtered = records.filter((record) => {
    const haystack = `${record.trace.id} ${record.useCase} ${record.trace.status}`.toLowerCase();
    return (
      (status === "all" || record.trace.status === status) &&
      (useCase === "all" || record.useCaseId === useCase) &&
      haystack.includes(query.toLowerCase())
    );
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Execution History</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Scenario execution records</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Historical executions are stored locally as traces. The table focuses on scenario outcomes, and the trace ID
          links each run to Advanced Diagnostics.
        </p>
      </header>

      <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 lg:grid-cols-[1fr_220px_220px_auto]">
        <input
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          placeholder="Search by use case, status, or trace ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
        <select
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
        >
          <option value="all">All use cases</option>
          {useCases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} {item.shortTitle}
            </option>
          ))}
        </select>
        <button
          className="rounded-xl border border-red-300/30 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-400/10"
          onClick={() => void clearRunning()}
        >
          Clear Running
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80">
        <div className="grid grid-cols-[1.2fr_1fr_120px_120px_1fr_80px] gap-4 border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Timestamp</span>
          <span>Use Case</span>
          <span>Status</span>
          <span>Duration</span>
          <span>Trace ID</span>
          <span>Action</span>
        </div>
        {filtered.map(({ trace, useCase, duration, environment }) => (
          <div
            key={trace.id}
            className="grid grid-cols-[1.2fr_1fr_120px_120px_1fr_80px] gap-4 border-b border-white/5 px-4 py-4 text-sm text-slate-300 last:border-0"
          >
            <span>{new Date(trace.createdAt).toLocaleString()}</span>
            <span>
              {useCase}
              <span className="mt-1 block text-xs text-slate-500">{environment}</span>
            </span>
            <StatusBadge status={trace.status === "error" ? "failed" : trace.status === "success" ? "success" : "running"} />
            <span>{duration} ms</span>
            <span className="font-mono text-xs text-cyan-200">{trace.id}</span>
            <button className="text-xs font-semibold text-red-200 hover:text-red-100" onClick={() => void deleteTrace(trace.id)}>
              Delete
            </button>
          </div>
        ))}
        {!filtered.length ? (
          <div className="p-6 text-sm text-slate-400">
            <p>No execution records match the current filters.</p>
            {useCase !== "all" ? <p className="mt-2">Run this use case from the Use Cases page to create a new result.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function inferUseCaseId(events: TraceEvent[]) {
  const steps = new Set(events.map((event) => event.stepName));
  if (steps.has("fetchData")) return "UC-E5";
  if (steps.has("startTransfer") || steps.has("getTransfer") || steps.has("getEdrOrDataflow")) return "UC-E1";
  if (steps.has("getContractNegotiation") || steps.has("startContractNegotiation")) return "UC-E3";
  if (steps.has("requestCatalog")) return "UC-E4";
  return undefined;
}
