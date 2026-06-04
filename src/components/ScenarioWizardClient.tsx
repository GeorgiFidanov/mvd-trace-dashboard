"use client";

import { useMemo, useState } from "react";
import { roleLabels, useCases, wizardSteps, type WizardStepDefinition, type WizardStepStatus } from "@/lib/useCases";
import type { MvdStepResult } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type StepState = Record<string, WizardStepStatus>;
type Selection = {
  traceId?: string;
  assetId?: string;
  contractOfferId?: string;
  contractNegotiationId?: string;
  contractAgreementId?: string;
  transferProcessId?: string;
  accessToken?: string;
};
type StepExecution = { result: unknown; selection: Selection };

const initialStates = Object.fromEntries(wizardSteps.map((step) => [step.id, "pending"])) as StepState;

export function ScenarioWizardClient({ initialUseCase = "UC-E5" }: { initialUseCase?: string }) {
  const [selectedUseCase, setSelectedUseCase] = useState(initialUseCase);
  const [activeStepId, setActiveStepId] = useState(wizardSteps[0].id);
  const [states, setStates] = useState<StepState>(initialStates);
  const [selection, setSelection] = useState<Selection>({});
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visibleSteps = useMemo(
    () => wizardSteps.filter((step) => selectedUseCase === "UC-E5" || step.useCaseIds.includes(selectedUseCase)),
    [selectedUseCase],
  );
  const selectedUseCaseDetails = useCases.find((useCase) => useCase.id === selectedUseCase) ?? useCases[0];
  const activeStep = visibleSteps.find((step) => step.id === activeStepId) ?? visibleSteps[0];
  const progress = Math.round((visibleSteps.filter((step) => states[step.id] === "success").length / visibleSteps.length) * 100);

  async function runScenario() {
    reset(false);
    let localSelection: Selection = {};
    let completed = true;
    for (const step of visibleSteps) {
      const nextSelection = await runStep(step, localSelection, false);
      if (!nextSelection) {
        completed = false;
        break;
      }
      localSelection = nextSelection;
    }
    if (localSelection.traceId) {
      await finalizeTrace(localSelection.traceId, completed ? "success" : "error");
    }
  }

  async function runStep(step = activeStep, currentSelection = selection, throwOnError = true): Promise<Selection | null> {
    if (!step) return currentSelection;
    setActiveStepId(step.id);
    setStates((current) => ({ ...current, [step.id]: "running" }));
    setMessage(null);

    try {
      const execution = await executeStep(step, currentSelection);
      setLastResult(execution.result);
      setSelection(execution.selection);
      setStates((current) => ({ ...current, [step.id]: "success" }));
      setMessage(step.outcomeSummary);
      return execution.selection;
    } catch (error) {
      setStates((current) => ({ ...current, [step.id]: "failed" }));
      setMessage(error instanceof Error ? error.message : String(error));
      if (throwOnError) throw error;
      return null;
    }
  }

  async function executeStep(step: WizardStepDefinition, currentSelection: Selection): Promise<StepExecution> {
    if (step.id === "offer-selection") {
      if (!currentSelection.contractOfferId) throw new Error("No catalog offer is available yet. Run Catalog Discovery first.");
      const nextSelection = await ensureTrace(currentSelection);
      return {
        result: { summary: "Offer selected for validation", selectedOffer: "Available in Advanced Diagnostics" },
        selection: nextSelection,
      };
    }

    if (step.action === "health") {
      const nextSelection = await ensureTrace(currentSelection);
      return { result: await callMvd("health"), selection: nextSelection };
    }

    if (step.action === "requestCatalog") {
      const result = await callMvd<MvdStepResult>("requestCatalog", { traceId: currentSelection.traceId, useCaseId: selectedUseCase });
      const ids = result.event.extractedIds;
      return {
        result,
        selection: {
          ...currentSelection,
        traceId: result.trace.id,
        assetId: ids.assetId ?? result.trace.assetId ?? undefined,
        contractOfferId: ids.contractOfferId ?? result.trace.contractOfferId ?? undefined,
        },
      };
    }

    if (step.action === "startContractNegotiation") {
      if (!currentSelection.contractOfferId) throw new Error("Catalog Discovery must produce an offer before negotiation can start.");
      const result = await callMvd<MvdStepResult>("startContractNegotiation", {
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        offerId: currentSelection.contractOfferId,
        assetId: currentSelection.assetId,
      });
      return {
        result,
        selection: {
          ...currentSelection,
        traceId: result.trace.id,
        contractNegotiationId: result.event.extractedIds.contractNegotiationId ?? result.trace.contractNegotiationId ?? undefined,
        contractAgreementId: result.event.extractedIds.contractAgreementId ?? result.trace.contractAgreementId ?? undefined,
        },
      };
    }

    if (step.action === "getContractNegotiation") {
      if (!currentSelection.contractNegotiationId) throw new Error("Negotiation must start before policy validation can be checked.");
      let result = await callMvd<MvdStepResult>("getContractNegotiation", {
          traceId: currentSelection.traceId,
          useCaseId: selectedUseCase,
          negotiationId: currentSelection.contractNegotiationId,
        });
      let agreementId = result.event.extractedIds.contractAgreementId ?? result.trace.contractAgreementId ?? currentSelection.contractAgreementId;
      for (let i = 0; i < 8 && !agreementId; i += 1) {
        if (result.event.extractedIds.state === "TERMINATED") {
          throw new Error("Policy validation terminated the negotiation.");
        }
        await delay(900);
        result = await callMvd<MvdStepResult>("getContractNegotiation", {
          traceId: currentSelection.traceId,
          useCaseId: selectedUseCase,
          negotiationId: currentSelection.contractNegotiationId,
        });
        agreementId = result.event.extractedIds.contractAgreementId ?? result.trace.contractAgreementId ?? currentSelection.contractAgreementId;
      }
      if (!agreementId) {
        throw new Error("Policy validation did not produce an agreement yet. Try this step again after the provider finalizes negotiation.");
      }
      return {
        result,
        selection: {
          ...currentSelection,
          contractAgreementId: agreementId,
        },
      };
    }

    if (step.action === "startTransfer") {
      if (!currentSelection.contractAgreementId) throw new Error("A contract agreement is required before transfer initialization.");
      const result = await callMvd<MvdStepResult>("startTransfer", {
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        agreementId: currentSelection.contractAgreementId,
        assetId: currentSelection.assetId,
      });
      return {
        result,
        selection: {
          ...currentSelection,
          transferProcessId: result.event.extractedIds.transferProcessId ?? result.trace.transferProcessId ?? undefined,
        },
      };
    }

    if (step.action === "fetchData") {
      if (!currentSelection.transferProcessId) throw new Error("A transfer process is required before data retrieval.");
      const edr = await callMvd<MvdStepResult>("getEdrOrDataflow", {
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
      });
      const accessToken = extractAccessToken(edr.data);
      const result = await callMvd("fetchData", {
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
        accessToken,
      });
      return { result, selection: { ...currentSelection, accessToken } };
    }

    return { result: { summary: "Step prepared for future EduCloud validation" }, selection: await ensureTrace(currentSelection) };
  }

  async function ensureTrace(currentSelection: Selection) {
    if (currentSelection.traceId) return currentSelection;
    const response = await fetch("/api/traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useCaseId: selectedUseCase, status: "success" }),
    });
    const data = await response.json();
    return { ...currentSelection, traceId: data.trace?.id };
  }

  async function finalizeTrace(traceId: string, status: "success" | "error") {
    await fetch("/api/traces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: traceId, status }),
    });
  }

  async function callMvd<T = unknown>(action: string, payload: Record<string, unknown> = {}) {
    const response = await fetch("/api/mvd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? `Request failed: ${response.status}`);
    return data as T;
  }

  function reset(clearResult = true) {
    setStates(initialStates);
    setSelection({});
    setMessage(null);
    if (clearResult) setLastResult(null);
    setActiveStepId(visibleSteps[0]?.id ?? wizardSteps[0].id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/15 via-slate-900 to-indigo-500/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Dataspace Scenario Wizard</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Validate a dataspace use case step by step</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Run the scenario as a guided educational workflow. The wizard explains what happened and why, while the
              trace ID is kept for Advanced Diagnostics.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200" onClick={() => reset()}>
              Replay
            </button>
            <button className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => void runScenario().catch(() => undefined)}>
              Run Scenario
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <select
            className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
            value={selectedUseCase}
            onChange={(event) => {
              setSelectedUseCase(event.target.value);
              reset();
            }}
          >
            {useCases.map((useCase) => (
              <option key={useCase.id} value={useCase.id}>
                {useCase.id} - {useCase.shortTitle}
              </option>
            ))}
          </select>
          <div className="text-sm font-semibold text-cyan-100">{progress}% complete</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
          <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-slate-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Selected Use Case</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {selectedUseCaseDetails.id} · {selectedUseCaseDetails.shortTitle}
              </h2>
            </div>
            <StatusBadge status={selectedUseCaseDetails.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{selectedUseCaseDetails.goal}</p>
          <p className="mt-2 text-sm text-slate-400">Success: {selectedUseCaseDetails.successCriteria}</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4">
            {visibleSteps.map((step, index) => (
              <button
                key={step.id}
                className={`group grid gap-4 rounded-3xl border p-4 text-left transition md:grid-cols-[auto_1fr_auto] md:items-center ${
                  activeStep?.id === step.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-slate-900/60 hover:bg-white/10"
                }`}
                onClick={() => setActiveStepId(step.id)}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-cyan-200">
                  {index + 1}
                </span>
                <span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{roleLabels[step.role]}</span>
                  <span className="mt-1 block text-lg font-semibold text-white">{step.title}</span>
                  <span className="mt-1 block text-sm text-slate-400">{step.successCriteria}</span>
                </span>
                <StatusBadge status={states[step.id]} />
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-[2rem] border border-white/10 bg-slate-900/90 p-5">
          {activeStep ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Selected Step</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{activeStep.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{activeStep.explanation}</p>
              <div className="mt-5 rounded-2xl bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What Success Means</p>
                <p className="mt-2 text-sm text-slate-200">{activeStep.outcomeSummary}</p>
              </div>
              <button
                className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                disabled={states[activeStep.id] === "running"}
                onClick={() => void runStep(activeStep).catch(() => undefined)}
              >
                {states[activeStep.id] === "running" ? "Running..." : "Run Individual Step"}
              </button>
              {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{message}</p> : null}
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applied Scenario Data</p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <ScenarioDataRow label="Trace" value={selection.traceId ? shortId(selection.traceId) : "Created when a step runs"} />
                  <ScenarioDataRow label="Discovered asset" value={selection.assetId ?? "Waiting for catalog discovery"} />
                  <ScenarioDataRow label="Offer" value={selection.contractOfferId ? "Selected from catalog" : "Waiting for offer selection"} />
                  <ScenarioDataRow label="Agreement" value={selection.contractAgreementId ? "Agreement available" : "Not agreed yet"} />
                  <ScenarioDataRow label="Transfer" value={selection.transferProcessId ? "Transfer initialized" : "Not started yet"} />
                </dl>
              </div>
              {lastResult ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Result</p>
                  <p className="mt-2 text-sm text-slate-300">Technical payload captured. Use Advanced Diagnostics for raw requests and responses.</p>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function extractAccessToken(value: unknown) {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const dataflow = "endpointProperties" in body ? body : Object.values(body)[0];
  const properties =
    dataflow && typeof dataflow === "object" && Array.isArray((dataflow as { endpointProperties?: unknown }).endpointProperties)
      ? (dataflow as { endpointProperties: { name?: string; value?: string }[] }).endpointProperties
      : [];
  return properties.find((item) => item.name === "access_token")?.value;
}

function ScenarioDataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-200">{value}</dd>
    </div>
  );
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
