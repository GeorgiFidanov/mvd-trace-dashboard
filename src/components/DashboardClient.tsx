"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { FlowSelection, MvdConfig, MvdStepResult, TraceWithEvents } from "@/lib/types";
import { JsonBlock } from "./JsonBlock";
import { SequenceView, TraceDiagnosisPanel, TraceTimeline } from "./TraceTimeline";
import { Button, SecondaryButton } from "./ui/button";
import { Card, CardDescription, CardTitle } from "./ui/card";
import { useCases } from "@/lib/useCases";
import { diagnoseTrace, displayTraceEvents, effectiveTraceStatus } from "@/lib/traceDiagnosis";

type View = "overview" | "catalog" | "negotiation" | "transfer" | "data" | "traces" | "settings";
const emptySubscribe = () => () => undefined;

export function DashboardClient({ view = "overview" }: { view?: View }) {
  const [config, setConfig] = useState<MvdConfig | null>(null);
  const [trace, setTrace] = useState<TraceWithEvents | null>(null);
  const [traces, setTraces] = useState<TraceWithEvents[]>([]);
  const [selection, setSelection] = useState<FlowSelection>({});
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traceQuery, setTraceQuery] = useState("");
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    void refreshSettings();
    void refreshTraceList();
  }, []);

  const visibleEvents = useMemo(() => displayTraceEvents(trace?.events ?? []), [trace?.events]);
  const title = useMemo(() => viewTitle(view), [view]);
  const disableAfterHydration = (disabled: boolean) => (hydrated ? disabled : undefined);
  const filteredTraces = useMemo(
    () =>
      traces.filter((item) => {
        const haystack = `${item.id} ${item.status} ${traceUseCaseLabel(item)}`.toLowerCase();
        return haystack.includes(traceQuery.toLowerCase());
      }),
    [traceQuery, traces],
  );

  async function refreshSettings() {
    const response = await fetch("/api/settings", { cache: "no-store" });
    const data = await response.json();
    setConfig(data.config);
  }

  async function refreshTraceList() {
    const response = await fetch("/api/traces", { cache: "no-store" });
    const data = await response.json();
    setTraces(data.traces ?? []);
  }

  async function refreshTrace(traceId?: string) {
    const id = traceId ?? trace?.id;
    if (!id) return;
    const response = await fetch(`/api/traces?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await response.json();
    setTrace(data.trace);
  }

  async function call<T = MvdStepResult>(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch("/api/mvd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, traceId: trace?.id, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Request failed: ${response.status}`);
      if (isMvdStepResult(data) && data.event.status === "error") {
        throw new Error(data.event.errorMessage ?? "MVD step failed");
      }
      setLastResult(data);
      if (isMvdStepResult(data)) {
        setSelection((current) => ({ ...current, ...data.event.extractedIds }));
        await refreshTrace(data.trace.id);
        await refreshTraceList();
      }
      return data as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setBusy(null);
    }
  }

  function runTask(task: () => Promise<unknown>) {
    void task().catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }

  async function saveSettings(form: FormData) {
    const body = Object.fromEntries(form.entries()) as Partial<MvdConfig>;
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setConfig(data.config);
    setLastResult(data);
  }

  if (view === "traces") {
    return (
      <div className="mx-auto max-w-7xl space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/60 p-6 text-slate-100">
        <header>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">Advanced Diagnostics</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Trace explorer</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Select a saved execution and inspect its timeline, sequence view, requests, responses, and extracted protocol
              data. Run scenarios from the Scenario Wizard; traces appear here automatically.
            </p>
          </div>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-auto">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Executions</CardTitle>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{filteredTraces.length}</span>
            </div>
            <input
              className="mt-4 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              placeholder="Search use case, status, trace ID"
              value={traceQuery}
              onChange={(event) => setTraceQuery(event.target.value)}
            />
            <div className="mt-4 grid gap-2">
              {filteredTraces.map((item) => {
                const selected = trace?.id === item.id;
                const itemEvents = displayTraceEvents(item.events ?? []);
                const itemStatus = effectiveTraceStatus(item.status, item.events ?? []);
                return (
                  <button
                    key={item.id}
                    onClick={() => refreshTrace(item.id)}
                    className={`rounded-xl border p-3 text-left text-sm transition ${
                      selected ? "border-cyan-400 bg-cyan-400/10 shadow-sm" : "border-white/10 bg-slate-900/80 hover:border-cyan-300/40 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-white">{traceUseCaseLabel(item)}</div>
                      <span className={traceStatusClass(itemStatus)}>{itemStatus}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
                    <div className="mt-2 truncate font-mono text-xs text-slate-500">{item.id}</div>
                    <div className="mt-2 text-xs text-slate-400">{itemEvents.length} recorded steps</div>
                  </button>
                );
              })}
              {!filteredTraces.length ? <p className="text-sm text-slate-400">No traces match the current search.</p> : null}
            </div>
          </aside>

          <section className="min-w-0 space-y-5">
            {trace ? (
              <>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Execution</p>
                      <CardTitle>{traceUseCaseLabel(trace)}</CardTitle>
                      <CardDescription>
                        {new Date(trace.createdAt).toLocaleString()} · {visibleEvents.length} steps · trace{" "}
                        <span className="font-mono">{trace.id}</span>
                      </CardDescription>
                    </div>
                    <span className={traceStatusClass(effectiveTraceStatus(trace.status, trace.events ?? []))}>
                      {effectiveTraceStatus(trace.status, trace.events ?? [])}
                    </span>
                  </div>
                </Card>
                <TraceDiagnosisPanel diagnosis={diagnoseTrace(visibleEvents)} />
                <Card>
                  <CardTitle>Trace Timeline</CardTitle>
                  <div className="mt-4">
                    <TraceTimeline events={visibleEvents} />
                  </div>
                </Card>
                <Card>
                  <CardTitle>Sequence View</CardTitle>
                  <div className="mt-4">
                    <SequenceView events={visibleEvents} />
                  </div>
                </Card>
                <Card>
                  <CardTitle>Applied Data</CardTitle>
                  <div className="mt-4">
                    <JsonBlock value={{ selectedTrace: trace, lastResult }} />
                  </div>
                </Card>
              </>
            ) : (
              <Card>
                <CardTitle>Select an execution</CardTitle>
                <CardDescription>
                  Choose a trace from the left to inspect its timeline and payloads. The latest executions are listed
                  first, with inferred use-case labels to reduce memory work.
                </CardDescription>
              </Card>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/60 p-6 text-slate-100">
      <header>
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-200">{title}</p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            {view === "settings" ? "Environment settings" : "EDC MVD trace dashboard"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {view === "settings"
              ? "Configure the endpoints and credentials the dashboard uses for local MVD or EduCloud deployments."
              : "Manual step controls for catalog, negotiation, transfer, and data retrieval. For guided use-case runs, use the Scenario Wizard instead."}
          </p>
        </div>
      </header>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {(view === "overview" || view === "catalog") && (
        <Card>
          <CardTitle>Catalog Explorer</CardTitle>
          <CardDescription>Requests the provider catalog through the consumer control plane and extracts asset/offer IDs.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => runTask(() => call("requestCatalog"))} disabled={Boolean(busy)}>
              Request Catalog
            </Button>
            <ManualFields selection={selection} setSelection={setSelection} fields={["assetId", "contractOfferId"]} />
          </div>
        </Card>
      )}

      {(view === "overview" || view === "negotiation") && (
        <Card>
          <CardTitle>Contract Negotiation Monitor</CardTitle>
          <CardDescription>Starts negotiation for the selected offer and polls until the agreement ID is available.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() =>
                runTask(() => call("startContractNegotiation", { offerId: selection.contractOfferId, assetId: selection.assetId }))
              }
              disabled={disableAfterHydration(Boolean(busy || !selection.contractOfferId))}
            >
              Start Negotiation
            </Button>
            <SecondaryButton
              onClick={() => runTask(() => call("getContractNegotiation", { negotiationId: selection.contractNegotiationId }))}
              disabled={disableAfterHydration(Boolean(busy || !selection.contractNegotiationId))}
            >
              Poll Negotiation
            </SecondaryButton>
            <ManualFields selection={selection} setSelection={setSelection} fields={["contractNegotiationId", "contractAgreementId"]} />
          </div>
        </Card>
      )}

      {(view === "overview" || view === "transfer") && (
        <Card>
          <CardTitle>Transfer Monitor</CardTitle>
          <CardDescription>Starts an HTTP proxy transfer from the agreement and polls transfer state.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() =>
                runTask(() => call("startTransfer", { agreementId: selection.contractAgreementId, assetId: selection.assetId }))
              }
              disabled={disableAfterHydration(Boolean(busy || !selection.contractAgreementId))}
            >
              Start Transfer
            </Button>
            <SecondaryButton
              onClick={() => runTask(() => call("getTransfer", { transferProcessId: selection.transferProcessId }))}
              disabled={disableAfterHydration(Boolean(busy || !selection.transferProcessId))}
            >
              Poll Transfer
            </SecondaryButton>
            <ManualFields selection={selection} setSelection={setSelection} fields={["transferProcessId"]} />
          </div>
        </Card>
      )}

      {(view === "overview" || view === "data") && (
        <Card>
          <CardTitle>EDR / Data Access</CardTitle>
          <CardDescription>Reads open dataflow metadata from the consumer data-plane proxy, then fetches the final data.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => runTask(() => call("getEdrOrDataflow", { transferProcessId: selection.transferProcessId }))}
              disabled={disableAfterHydration(Boolean(busy || !selection.transferProcessId))}
            >
              Retrieve EDR / Dataflow
            </Button>
            <SecondaryButton
              onClick={() =>
                runTask(() => call("fetchData", { transferProcessId: selection.transferProcessId, accessToken: selection.accessToken }))
              }
              disabled={disableAfterHydration(Boolean(busy || !selection.transferProcessId))}
            >
              Fetch Data
            </SecondaryButton>
            <ManualFields selection={selection} setSelection={setSelection} fields={["accessToken"]} />
          </div>
        </Card>
      )}

      {view === "settings" && config ? (
        <SettingsForm
          config={config}
          onSave={saveSettings}
          busy={Boolean(busy)}
        />
      ) : null}

      {view !== "settings" ? <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardTitle>Trace Timeline</CardTitle>
          <div className="mt-4">
            <TraceTimeline events={visibleEvents} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitle>Sequence View</CardTitle>
            <div className="mt-4">
              <SequenceView events={visibleEvents} />
            </div>
          </Card>
          <Card>
            <CardTitle>Last Result</CardTitle>
            <div className="mt-4">
              <JsonBlock value={lastResult ?? { trace, selection }} />
            </div>
          </Card>
        </div>
      </div> : null}
    </div>
  );
}

function ManualFields({
  selection,
  setSelection,
  fields,
}: {
  selection: FlowSelection;
  setSelection: (value: (current: FlowSelection) => FlowSelection) => void;
  fields: (keyof FlowSelection)[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <input
          key={field}
          className="min-w-64 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
          placeholder={field}
          value={selection[field] ?? ""}
          onChange={(event) => setSelection((current) => ({ ...current, [field]: event.target.value }))}
        />
      ))}
    </div>
  );
}

function SettingsForm({
  config,
  onSave,
  busy,
}: {
  config: MvdConfig;
  onSave: (form: FormData) => Promise<void>;
  busy: boolean;
}) {
  const primaryFields = [
    ["consumerControlPlaneUrl", "Consumer control plane", "Used for health checks; scenario calls use its management port automatically."],
    ["consumerDataPlaneUrl", "Consumer data plane", "Used for health checks; data access calls use its proxy port automatically."],
    ["consumerIdentityHubUrl", "Consumer IdentityHub", "DID and trust endpoint for the consumer participant."],
    ["providerControlPlaneUrl", "Provider control plane", "Provider-side control plane health/base URL."],
    ["providerDataPlaneUrl", "Provider data plane", "Provider-side data plane health/base URL."],
    ["providerIdentityHubUrl", "Provider IdentityHub", "DID and trust endpoint for the provider participant."],
    ["providerDspUrl", "Provider DSP endpoint", "The real DSP protocol endpoint used inside catalog, contract, and transfer requests."],
    ["providerId", "Provider participant ID", "The DID-style participant identifier used in EDC request bodies."],
  ] as const;
  const supportFields = [
    ["providerVaultUrl", "Provider Vault health", "Health endpoint used to check whether provider secrets storage is reachable."],
    ["issuerUrl", "Issuer service", "Issuer/admin endpoint used by the trust flow."],
    ["traefikUrl", "Traefik gateway", "Gateway URL. A 404 at / is treated as reachable but no route matched."],
    ["apiKeyHeader", "API key header", "Header name sent to EDC management APIs."],
    ["apiKeyValue", "API key value", "Demo credential value; saved settings are local only."],
    ["mockMode", "Mock mode", "on = fake data only, auto = fallback when real calls fail, off = fail fast."],
  ] as const;
  const advancedFields = [
    ["publicApiUrl", "Public dashboard API URL", "Optional public URL used for deployment metadata."],
    ["clusterName", "Cluster name", "Human-readable cluster label shown in status screens."],
    ["environment", "Environment", "Human-readable environment label such as local, educloud, or demo."],
    ["otelEndpoint", "OpenTelemetry endpoint", "Optional telemetry collector URL. Leave empty if you are not exporting traces."],
  ] as const;

  return (
    <Card>
      <CardTitle>Environment Configuration</CardTitle>
      <CardDescription>
        These fields control what the dashboard calls. Save Settings writes values to local SQLite. Health Check only
        tests reachability and does not change the MVD deployment.
      </CardDescription>
      <form action={onSave} className="mt-5 grid gap-5">
        <SettingsGroup title="Core EDC services" fields={primaryFields} config={config} />
        <SettingsGroup title="Trust, gateway, and credentials" fields={supportFields} config={config} />
        <details className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-100">Advanced dashboard metadata</summary>
          <div className="mt-4">
            <SettingsGroup title="Optional fields" fields={advancedFields} config={config} compact />
          </div>
        </details>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>
            Save Settings
          </Button>
        </div>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        To test these URLs, open Deployment Status and use Refresh health check. Settings only saves configuration.
      </p>
    </Card>
  );
}

function SettingsGroup({
  title,
  fields,
  config,
  compact = false,
}: {
  title: string;
  fields: readonly (readonly [keyof MvdConfig, string, string])[];
  config: MvdConfig;
  compact?: boolean;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className={`mt-3 grid gap-3 ${compact ? "md:grid-cols-2" : "lg:grid-cols-2"}`}>
        {fields.map(([key, label, help]) => (
          <label key={key} className="grid gap-1 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm font-medium text-slate-200">
            <span>{label}</span>
            <input
              name={key}
              defaultValue={config[key]}
              className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs font-normal text-slate-100 placeholder:text-slate-600"
              type={key.toLowerCase().includes("key") ? "password" : "text"}
            />
            <span className="text-xs leading-5 text-slate-500">{help}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function traceUseCaseLabel(trace: Pick<TraceWithEvents, "useCaseId" | "events">) {
  const details = useCases.find((useCase) => useCase.id === trace.useCaseId);
  return details ? `${details.id} ${details.shortTitle}` : inferUseCase(trace.events ?? []);
}

function inferUseCase(events: TraceWithEvents["events"]) {
  const steps = new Set(events.map((event) => event.stepName));
  if (steps.has("interoperability-findings")) return "UC-E6 Interoperability Findings";
  if (steps.has("identity-verification")) return "UC-E2 Identity & Trust";
  if (steps.has("fetchData")) return "UC-E5 End-to-End Scenario";
  if (steps.has("startTransfer") || steps.has("getTransfer") || steps.has("getEdrOrDataflow")) {
    return "UC-E1 Data Discovery & Transfer";
  }
  if (steps.has("getContractNegotiation")) return "UC-E3 Policy Enforcement";
  if (steps.has("startContractNegotiation")) return "UC-E3 Contract & Policy Validation";
  if (steps.has("requestCatalog")) return "UC-E4 Federated Catalog Discovery";
  return "Unclassified Execution";
}

function traceStatusClass(status: TraceWithEvents["status"]) {
  const base = "rounded-full px-2 py-1 text-xs font-semibold";
  if (status === "success") return `${base} bg-emerald-100 text-emerald-700`;
  if (status === "error") return `${base} bg-red-100 text-red-700`;
  if (status === "running") return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-slate-100 text-slate-600`;
}

function isMvdStepResult(value: unknown): value is MvdStepResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      "trace" in value &&
      "event" in value &&
      (value as { event?: { extractedIds?: unknown } }).event?.extractedIds,
  );
}

function viewTitle(view: View) {
  const titles: Record<View, string> = {
    overview: "Overview",
    catalog: "Catalog",
    negotiation: "Negotiation",
    transfer: "Transfer",
    data: "Data Access",
    traces: "Traces",
    settings: "Settings",
  };
  return titles[view];
}
