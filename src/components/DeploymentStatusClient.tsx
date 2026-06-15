"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { HealthCheckResult } from "@/lib/types";

type ReadyResponse = {
  ready: boolean;
  environment: string;
  clusterName: string;
  checks: Record<string, HealthCheckResult>;
  timestamp: string;
};

const services = [
  ["dashboard", "Dashboard"],
  ["consumerControlPlane", "Consumer CP"],
  ["consumerDataPlane", "Consumer DP"],
  ["consumerIdentityHub", "Consumer IdentityHub"],
  ["providerControlPlane", "Provider CP"],
  ["providerDataPlane", "Provider DP"],
  ["providerIdentityHub", "Provider IdentityHub"],
  ["providerVault", "Provider Vault"],
  ["issuer", "Issuer"],
  ["traefik", "Traefik"],
  ["database", "Database"],
];

export function DeploymentStatusClient() {
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/ready", { cache: "no-store" });
      setReady(await response.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Deployment Status</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Dataspace platform reachability</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Health checks use business-friendly status labels first. Advanced Diagnostics still keeps the checked URL,
            response status, latency, and raw error message available for technical review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-xl bg-pink-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-pink-200 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Refresh health check"}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Environment" value={ready?.environment ?? process.env.NEXT_PUBLIC_ENVIRONMENT ?? "local"} />
        <Metric label="Cluster" value={ready?.clusterName ?? process.env.NEXT_PUBLIC_CLUSTER_NAME ?? "local-mvd"} />
        <Metric label="Last Health Check" value={ready?.timestamp ? new Date(ready.timestamp).toLocaleString() : "Not checked"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {services.map(([key, label]) => {
          const check =
            key === "dashboard"
              ? {
                  ok: true,
                  state: "success" as const,
                  status: 200,
                  durationMs: 0,
                  url: "/",
                  checkedUrl: "/",
                  service: "Dashboard",
                  explanation: "Success: service is reachable.",
                  detail: "The dashboard application rendered this status page.",
                  dedicatedHealthEndpoint: true,
                }
              : ready?.checks?.[key];
          const status = check?.state ?? "offline";
          return (
            <article key={key} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{label}</h2>
                <StatusBadge status={status} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {check?.explanation ?? "Offline: connection failed, timed out, or DNS failed."}
              </p>
              <dl className="mt-4 grid gap-2 text-sm text-slate-400">
                <Row label="Last Status" value={check?.status ? String(check.status) : "Not available"} />
                <Row label="Latency" value={check ? `${check.durationMs} ms` : "Not checked"} />
                <Row label="Endpoint Type" value={check?.dedicatedHealthEndpoint ? "Dedicated health" : "Reachability probe"} />
              </dl>
              <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Technical detail
                </summary>
                <dl className="mt-3 grid gap-2 text-xs text-slate-400">
                  <Row label="Checked URL" value={check?.checkedUrl ?? "Not checked"} />
                  <Row label="Detail" value={check?.detail ?? "No response captured"} />
                </dl>
              </details>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-slate-200">{value}</dd>
    </div>
  );
}
