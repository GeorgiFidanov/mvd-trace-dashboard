"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";

type Check = { ok: boolean; status: number | null; durationMs: number; error?: string };
type ReadyResponse = {
  ready: boolean;
  environment: string;
  clusterName: string;
  checks: Record<string, Check>;
  timestamp: string;
};

const services = [
  ["dashboard", "Dashboard"],
  ["consumerControlPlane", "Consumer CP"],
  ["consumerDataPlane", "Consumer DP"],
  ["providerControlPlane", "Provider CP"],
  ["providerDataPlane", "Provider DP"],
  ["identityHub", "IdentityHub"],
  ["vault", "Vault"],
  ["traefik", "Traefik"],
  ["database", "Database"],
];

export function DeploymentStatusClient() {
  const [ready, setReady] = useState<ReadyResponse | null>(null);

  useEffect(() => {
    void fetch("/api/ready", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setReady(data));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Deployment Status</p>
        <h1 className="mt-2 text-3xl font-bold text-white">EduCloud Kubernetes readiness</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          This page prepares the dashboard for cluster operation by showing dependency readiness, namespace context, and
          health-check timestamps.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Environment" value={ready?.environment ?? process.env.NEXT_PUBLIC_ENVIRONMENT ?? "local"} />
        <Metric label="Cluster" value={ready?.clusterName ?? process.env.NEXT_PUBLIC_CLUSTER_NAME ?? "local-mvd"} />
        <Metric label="Last Health Check" value={ready?.timestamp ? new Date(ready.timestamp).toLocaleString() : "Not checked"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {services.map(([key, label]) => {
          const check = key === "dashboard" ? { ok: true, status: 200, durationMs: 0 } : ready?.checks?.[key];
          const status = check?.ok ? "success" : check ? "warning" : "offline";
          return (
            <article key={key} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">{label}</h2>
                <StatusBadge status={status} />
              </div>
              <dl className="mt-4 grid gap-2 text-sm text-slate-400">
                <Row label="Version" value={key === "dashboard" ? "0.1.0" : "MVD managed"} />
                <Row label="Namespace" value={process.env.NEXT_PUBLIC_ENVIRONMENT ?? "local"} />
                <Row label="Pod Count" value={key === "dashboard" ? "1 desired" : "Cluster reported"} />
                <Row label="Last Status" value={check?.status ? String(check.status) : "Not available"} />
                <Row label="Latency" value={check ? `${check.durationMs} ms` : "Not checked"} />
              </dl>
              {check?.error ? <p className="mt-3 text-sm text-amber-200">{check.error}</p> : null}
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
