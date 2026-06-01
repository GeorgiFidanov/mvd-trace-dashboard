"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { FlowSelection, MvdConfig, MvdStepResult, TraceWithEvents } from "@/lib/types";
import { JsonBlock } from "./JsonBlock";
import { SequenceView, TraceTimeline } from "./TraceTimeline";
import { Button, SecondaryButton } from "./ui/button";
import { Card, CardDescription, CardTitle } from "./ui/card";

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
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    void refreshSettings();
    void refreshTraceList();
  }, []);

  const events = trace?.events ?? [];
  const title = useMemo(() => viewTitle(view), [view]);
  const disableAfterHydration = (disabled: boolean) => (hydrated ? disabled : undefined);

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
      setLastResult(data);
      if (isMvdStepResult(data)) {
        setTrace({ ...data.trace, events: [...events, data.event] });
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

  async function newTrace() {
    const response = await fetch("/api/traces", { method: "POST" });
    const data = await response.json();
    setTrace({ ...data.trace, events: [] });
    setSelection({});
    setLastResult(data);
    return data.trace as TraceWithEvents;
  }

  async function runFullDemoFlow() {
    const created = await newTrace();
    const traceId = created.id;
    const catalog = await call("requestCatalog", { traceId });
    const ids = {
      ...catalog.event.extractedIds,
      assetId: catalog.event.extractedIds.assetId ?? catalog.trace.assetId ?? undefined,
      contractOfferId: catalog.event.extractedIds.contractOfferId ?? catalog.trace.contractOfferId ?? undefined,
    };
    if (!ids.contractOfferId) {
      throw new Error("Catalog response did not include a contract offer ID. Check the catalog result or enter contractOfferId manually.");
    }
    const negotiation = await call("startContractNegotiation", {
      traceId,
      offerId: ids.contractOfferId,
      assetId: ids.assetId,
    });
    const negotiationId = negotiation.event.extractedIds.contractNegotiationId;
    let agreementId = negotiation.event.extractedIds.contractAgreementId;
    if (!negotiationId) {
      throw new Error("Negotiation response did not include a contract negotiation ID.");
    }
    for (let i = 0; i < 10 && !agreementId; i += 1) {
      await delay(1200);
      const poll = await call("getContractNegotiation", { traceId, negotiationId });
      agreementId = poll.event.extractedIds.contractAgreementId;
      if (poll.event.extractedIds.state === "TERMINATED") break;
    }
    if (!agreementId) {
      throw new Error("Negotiation did not produce a contract agreement ID after polling.");
    }
    const transfer = await call("startTransfer", { traceId, agreementId, assetId: ids.assetId });
    const transferProcessId = transfer.event.extractedIds.transferProcessId;
    if (!transferProcessId) {
      throw new Error("Transfer response did not include a transfer process ID.");
    }
    for (let i = 0; i < 10; i += 1) {
      await delay(1200);
      const poll = await call("getTransfer", { traceId, transferProcessId });
      if (poll.event.extractedIds.state?.includes("STARTED")) break;
    }
    const edr = await call("getEdrOrDataflow", { traceId, transferProcessId });
    const accessToken = extractAccessToken(edr.data);
    await call("fetchData", { traceId, transferProcessId, accessToken });
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Eclipse EDC MVD trace dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Runs the catalog, contract negotiation, transfer, EDR/dataflow, and final data fetch flow through a local BFF
            and records every API call as a trace event.
          </p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => runTask(newTrace)} disabled={Boolean(busy)}>
            New Trace
          </SecondaryButton>
          <Button onClick={() => runTask(runFullDemoFlow)} disabled={Boolean(busy)}>
            {busy ? `Running ${busy}` : "Run Full Demo Flow"}
          </Button>
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
        <SettingsForm config={config} onSave={saveSettings} onHealth={() => runTask(() => call("health"))} busy={Boolean(busy)} />
      ) : null}

      {view === "traces" ? (
        <Card>
          <CardTitle>Saved Traces</CardTitle>
          <div className="mt-4 grid gap-2">
            {traces.map((item) => (
              <button
                key={item.id}
                onClick={() => refreshTrace(item.id)}
                className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
              >
                <div className="font-medium">{item.id}</div>
                <div className="text-slate-500">
                  {item.status} · {item.createdAt}
                </div>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardTitle>Trace Timeline</CardTitle>
          <div className="mt-4">
            <TraceTimeline events={events} />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitle>Sequence View</CardTitle>
            <div className="mt-4">
              <SequenceView events={events} />
            </div>
          </Card>
          <Card>
            <CardTitle>Last Result</CardTitle>
            <div className="mt-4">
              <JsonBlock value={lastResult ?? { trace, selection }} />
            </div>
          </Card>
        </div>
      </div>
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
          className="min-w-64 rounded-md border border-slate-200 px-3 py-2 text-sm"
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
  onHealth,
  busy,
}: {
  config: MvdConfig;
  onSave: (form: FormData) => Promise<void>;
  onHealth: () => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardTitle>Environment Configuration</CardTitle>
      <form action={onSave} className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.entries(config).map(([key, value]) => (
          <label key={key} className="grid gap-1 text-sm font-medium text-slate-700">
            {key}
            <input
              name={key}
              defaultValue={value}
              className="rounded-md border border-slate-200 px-3 py-2 font-mono text-xs font-normal"
              type={key.toLowerCase().includes("key") ? "password" : "text"}
            />
          </label>
        ))}
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={busy}>
            Save Settings
          </Button>
          <SecondaryButton type="button" onClick={onHealth} disabled={busy}>
            Health Check
          </SecondaryButton>
        </div>
      </form>
    </Card>
  );
}

function extractAccessToken(value: unknown) {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const dataflow = "endpointProperties" in body ? body : Object.values(body)[0];
  const properties =
    dataflow && typeof dataflow === "object" && Array.isArray((dataflow as { endpointProperties?: unknown }).endpointProperties)
      ? ((dataflow as { endpointProperties: { name?: string; value?: string }[] }).endpointProperties)
      : [];
  return properties.find((item) => item.name === "access_token")?.value;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
