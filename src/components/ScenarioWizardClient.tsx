"use client";

import { useMemo, useState } from "react";
import { isTransferReadyState, readTransferState } from "@/lib/mvdFlow";
import { roleLabels, useCases, wizardSteps, type WizardStepDefinition, type WizardStepStatus } from "@/lib/useCases";
import type { MvdStepResult } from "@/lib/types";
import { effectiveTraceStatus } from "@/lib/traceDiagnosis";
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
const EDR_POLL_ATTEMPTS = 30;
const EDR_POLL_DELAY_MS = 1000;
const TRANSFER_POLL_ATTEMPTS = 20;
const TRANSFER_POLL_DELAY_MS = 1000;

export function ScenarioWizardClient({ initialUseCase = "UC-E5" }: { initialUseCase?: string }) {
  const [selectedUseCase, setSelectedUseCase] = useState(initialUseCase);
  const [activeStepId, setActiveStepId] = useState(wizardSteps[0].id);
  const [states, setStates] = useState<StepState>(initialStates);
  const [selection, setSelection] = useState<Selection>({});
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showTechnicalLog, setShowTechnicalLog] = useState(false);

  const visibleSteps = useMemo(
    () => wizardSteps.filter((step) => step.useCaseIds.includes(selectedUseCase)),
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
      setShowTechnicalLog(false);
      return execution.selection;
    } catch (error) {
      const failedSelection = await recordStepFailure(step, currentSelection, error);
      setSelection(failedSelection);
      setLastResult({
        summary: "Step failed and was recorded in the trace log.",
        step: step.title,
        error: error instanceof Error ? error.message : String(error),
        traceId: failedSelection.traceId,
      });
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
      const summary = { summary: "Offer selected for validation", selectedOffer: "Available in Advanced Diagnostics" };
      if (nextSelection.traceId) {
        await recordWizardTraceEvent(nextSelection.traceId, step, "success", summary);
      }
      return {
        result: summary,
        selection: nextSelection,
      };
    }

    if (step.action === "health") {
      const nextSelection = await ensureTrace(currentSelection);
      const result = await callMvd("health");
      if (hasOfflineService(result)) {
        throw new Error("One or more required services are offline. Open Deployment Status for the detailed health result.");
      }
      if (nextSelection.traceId) {
        await recordWizardTraceEvent(nextSelection.traceId, step, "success", result);
      }
      return { result, selection: nextSelection };
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
      setMessage("Checking transfer state before opening the consumer data-plane proxy flow.");
      await pollTransferReady({
        callMvd,
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
        onWaiting: setMessage,
      });
      setMessage(
        "Checking whether the consumer data plane has opened a proxy dataflow for this transfer. " +
          "HTTP 204 means the flow is not open yet — the dashboard will wait and retry automatically.",
      );
      const { edr, accessToken } = await pollOpenDataflow({
        callMvd,
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
        onWaiting: setMessage,
      });
      setMessage("The proxy dataflow is open — fetching the protected data payload now.");
      const result = await callMvd("fetchData", {
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
        accessToken,
      });
      return { result: { edr, fetch: result }, selection: { ...currentSelection, accessToken } };
    }

    const nextSelection = await ensureTrace(currentSelection);
    const summary = {
      summary: "Step prepared for future EduCloud validation",
      findings: "Interoperability observations can be exported from Execution History.",
    };
    if (nextSelection.traceId) {
      await recordWizardTraceEvent(nextSelection.traceId, step, "success", summary);
    }
    return { result: summary, selection: nextSelection };
  }

  async function recordWizardTraceEvent(
    traceId: string,
    step: WizardStepDefinition,
    status: "success" | "error",
    responseBody: unknown,
    errorMessage?: string,
  ) {
    const now = new Date().toISOString();
    await fetch("/api/traces", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        traceId,
        stepName: step.id,
        actor: "Scenario Wizard",
        target: "Dashboard",
        status,
        requestBody: { useCaseId: selectedUseCase, step: step.title },
        responseBody,
        errorMessage,
        startedAt: now,
        completedAt: now,
      }),
    });
  }

  async function ensureTrace(currentSelection: Selection) {
    if (currentSelection.traceId) return currentSelection;
    const response = await fetch("/api/traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useCaseId: selectedUseCase, status: "running" }),
    });
    const data = await response.json();
    return { ...currentSelection, traceId: data.trace?.id };
  }

  async function recordStepFailure(step: WizardStepDefinition, currentSelection: Selection, error: unknown) {
    const nextSelection = await ensureTrace(currentSelection);
    const traceId = nextSelection.traceId;
    if (traceId) {
      const message = error instanceof Error ? error.message : String(error);
      const mvdStepFailed = Boolean(step.action && step.action !== "health");
      // MVD-backed steps record HTTP failures themselves, but fetchData can fail after only 204 responses.
      if (!mvdStepFailed || step.action === "fetchData") {
        const now = new Date().toISOString();
        await fetch("/api/traces", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            traceId,
            stepName: step.id,
            actor: "Scenario Wizard",
            target: "Dashboard",
            status: "error",
            errorMessage: message,
            requestBody: { selectedUseCase, step: step.title, selection: currentSelection },
            responseBody: { message },
            startedAt: now,
            completedAt: now,
          }),
        });
      }
      await finalizeTrace(traceId, "error");
    }
    return nextSelection;
  }

  async function finalizeTrace(traceId: string, status: "success" | "error") {
    const response = await fetch(`/api/traces?id=${encodeURIComponent(traceId)}`, { cache: "no-store" });
    const data = await response.json();
    const events = data.trace?.events ?? [];
    const finalStatus = effectiveTraceStatus(status, events);
    await fetch("/api/traces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: traceId, status: finalStatus }),
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
    if (isMvdStepResult(data) && data.event.status === "error") {
      throw new Error(data.event.errorMessage ?? "MVD step failed");
    }
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
        <div className="mt-5 rounded-[2rem] border border-pink-300/30 bg-gradient-to-br from-pink-300/15 to-cyan-300/10 p-5 shadow-xl shadow-slate-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">Currently Running Scenario</p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {selectedUseCaseDetails.id} · {selectedUseCaseDetails.shortTitle}
              </h2>
            </div>
            <StatusBadge status={selectedUseCaseDetails.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{selectedUseCaseDetails.goal}</p>
          <p className="mt-2 text-sm text-slate-400">Success: {selectedUseCaseDetails.successCriteria}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plain-language scenario result</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {message ??
              "The consumer asks for data access. The provider checks identity and policy. If the checks pass, access is granted and the data is exchanged through a controlled path."}
          </p>
        </div>
      </header>

      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Steps</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Follow the scenario one decision at a time</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Select a step on the left to see what the business user sees, what the platform does, and which evidence is recorded.
          Run the full scenario from the top, or run one step from the selected-step panel.
        </p>
      </section>

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
              <div className="mt-4 flex flex-wrap gap-2">
                {stepActors(activeStep).map((actor) => (
                  <ActorChip key={actor} actor={actor} />
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <ScenarioInfo label="What the user sees" value={stepBusinessContext(activeStep).userSees} />
                <ScenarioInfo label="What the system does" value={stepBusinessContext(activeStep).systemDoes} />
                <ScenarioInfo label="Responsible actor" value={stepBusinessContext(activeStep).actor} />
              </div>
              <div className="mt-5 rounded-2xl bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What Success Means</p>
                <p className="mt-2 text-sm text-slate-200">{activeStep.outcomeSummary}</p>
              </div>
              <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-cyan-100">
                  Mini executable steps
                </summary>
                <div className="mt-3 grid gap-2">
                  {stepMiniSteps(activeStep).map((miniStep, index) => (
                    <div key={miniStep} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15 text-xs font-black text-cyan-100">
                        {index + 1}
                      </span>
                      <span className="text-sm text-slate-200">{miniStep}</span>
                      <StatusBadge status={states[activeStep.id]} />
                    </div>
                  ))}
                </div>
              </details>
              <details className="mt-4 rounded-2xl border border-white/10 bg-[#11141c] p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-300">
                  DSSC mapping & audit panel
                </summary>
                <div className="mt-3 grid gap-3 text-sm">
                  <ScenarioInfo label="Building Block" value={stepDssc(activeStep).buildingBlock} />
                  <ScenarioInfo label="Protocol / Standard" value={stepDssc(activeStep).protocol} />
                  <ScenarioInfo label="Service Definition" value={stepDssc(activeStep).serviceDefinition} />
                  <ScenarioInfo label="Architectural Alignment & Audit Criteria" value={stepDssc(activeStep).auditCriteria} />
                </div>
              </details>
              <button
                className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                disabled={states[activeStep.id] === "running"}
                onClick={() => void runStep(activeStep).catch(() => undefined)}
              >
                {states[activeStep.id] === "running" ? "Running..." : "Run Individual Step"}
              </button>
              {states[activeStep.id] === "running" && activeStep.id === "data-retrieval" ? (
                <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
                  Data retrieval in progress. HTTP 204 from the consumer data plane means the proxy dataflow is not open yet — the
                  dashboard will wait and retry automatically. See the plain-language result above for live status.
                </p>
              ) : null}
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
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Result</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Technical payload captured. Use the toggle below or Advanced Diagnostics for raw requests and responses.
                      </p>
                    </div>
                    <button
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
                      onClick={() => setShowTechnicalLog((current) => !current)}
                    >
                      {showTechnicalLog ? "Hide technical log" : "Show technical log"}
                    </button>
                  </div>
                  {showTechnicalLog ? (
                    <pre className="mt-4 max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                      {JSON.stringify(lastResult, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

type MvdCaller = <T = unknown>(action: string, payload?: Record<string, unknown>) => Promise<T>;

function readTransferStateFromResult(result: MvdStepResult) {
  return result.event.extractedIds.state ?? readTransferState(result.data);
}

function notifyTransferState(options: { onWaiting: (message: string) => void }, state?: string) {
  if (state === "TERMINATED") {
    options.onWaiting(
      "Transfer state is TERMINATED. That can be normal for short HttpProxy-PULL transfers — the dashboard will still check whether the consumer data plane opened a proxy flow.",
    );
    return;
  }
  options.onWaiting(
    `Transfer state is "${state ?? "unknown"}" — waiting for STARTED before checking the data plane (this does not mean the scenario has failed yet).`,
  );
}

async function pollTransferReady(options: {
  callMvd: MvdCaller;
  traceId?: string;
  useCaseId: string;
  transferProcessId: string;
  onWaiting: (message: string) => void;
}) {
  const payload = {
    traceId: options.traceId,
    useCaseId: options.useCaseId,
    transferProcessId: options.transferProcessId,
  };

  let result = await options.callMvd<MvdStepResult>("getTransfer", payload);
  let state = readTransferStateFromResult(result);

  if (isTransferReadyState(state) || state === "TERMINATED") {
    if (state === "TERMINATED") notifyTransferState(options, state);
    return;
  }

  for (let attempt = 1; attempt < TRANSFER_POLL_ATTEMPTS; attempt += 1) {
    notifyTransferState(options, state);
    await delay(TRANSFER_POLL_DELAY_MS);
    result = await options.callMvd<MvdStepResult>("getTransfer", payload);
    state = readTransferStateFromResult(result);
    if (isTransferReadyState(state) || state === "TERMINATED") return;
  }

  options.onWaiting(
    `Transfer state is still "${state ?? "unknown"}" after ${TRANSFER_POLL_ATTEMPTS} checks. Checking the consumer data plane anyway.`,
  );
}

async function pollOpenDataflow(options: {
  callMvd: MvdCaller;
  traceId?: string;
  useCaseId: string;
  transferProcessId: string;
  onWaiting: (message: string) => void;
}): Promise<{ edr: MvdStepResult; accessToken: string }> {
  const payload = {
    traceId: options.traceId,
    useCaseId: options.useCaseId,
    transferProcessId: options.transferProcessId,
  };

  let edr = await options.callMvd<MvdStepResult>("getEdrOrDataflow", payload);
  let accessToken = extractAccessToken(edr.data);
  if (!accessToken) {
    const mgmtEdr = await tryManagementEdr(options.callMvd, payload);
    if (mgmtEdr) {
      accessToken = extractAccessToken(mgmtEdr.data);
      if (accessToken) edr = mgmtEdr;
    }
  }

  for (let attempt = 1; attempt < EDR_POLL_ATTEMPTS && !accessToken; attempt += 1) {
    const status = edr.event.responseStatus;
    if (status === 204) {
      options.onWaiting(
        `The consumer data plane returned HTTP 204 No Content — the transfer is registered, but the proxy dataflow is not open yet. ` +
          `The dashboard will also check the consumer control-plane EDR endpoint while waiting ` +
          `(retry ${attempt} of ${EDR_POLL_ATTEMPTS - 1})…`,
      );
    } else {
      options.onWaiting(
        `Waiting for an access token from the data-plane proxy or control-plane EDR endpoint ` +
          `(last status: HTTP ${status ?? "unknown"}, retry ${attempt} of ${EDR_POLL_ATTEMPTS - 1})…`,
      );
    }
    await delay(EDR_POLL_DELAY_MS);
    edr = await options.callMvd<MvdStepResult>("getEdrOrDataflow", payload);
    accessToken = extractAccessToken(edr.data);
    if (!accessToken) {
      const mgmtEdr = await tryManagementEdr(options.callMvd, payload);
      if (mgmtEdr) {
        accessToken = extractAccessToken(mgmtEdr.data);
        if (accessToken) edr = mgmtEdr;
      }
    }
  }

  if (!accessToken) {
    const mgmtEdr = await tryManagementEdr(options.callMvd, payload);
    if (mgmtEdr) {
      accessToken = extractAccessToken(mgmtEdr.data);
      if (accessToken) return { edr: mgmtEdr, accessToken };
    }
    const lastStatus = edr.event.responseStatus;
    if (lastStatus === 204) {
      throw new Error(
        `The data plane still returned HTTP 204 after ${EDR_POLL_ATTEMPTS} checks. The proxy dataflow never opened for this transfer — ` +
          "confirm the transfer reached STARTED on the provider side, then run Data Retrieval again.",
      );
    }
    throw new Error(
      "No access token was returned from the open dataflow endpoint. Inspect the getEdrOrDataflow response in Advanced Diagnostics, " +
        "then retry after the transfer completes.",
    );
  }

  return { edr, accessToken };
}

async function tryManagementEdr(callMvd: MvdCaller, payload: Record<string, unknown>) {
  try {
    return await callMvd<MvdStepResult>("getEdrDataAddress", payload);
  } catch {
    return null;
  }
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

function hasOfflineService(value: unknown) {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((item) => {
    if (!item || typeof item !== "object") return false;
    return (item as { state?: unknown }).state === "offline";
  });
}

function isMvdStepResult(value: unknown): value is MvdStepResult {
  return Boolean(value && typeof value === "object" && "event" in value && "trace" in value);
}

function stepActors(step: WizardStepDefinition) {
  const actors: Record<string, string[]> = {
    "identity-verification": ["Consumer POV", "Governance / Trust"],
    "catalog-discovery": ["Consumer POV", "Provider POV"],
    "offer-selection": ["Consumer POV", "Governance / Trust"],
    "contract-negotiation": ["Consumer POV", "Provider POV", "Agreement"],
    "policy-validation": ["Governance / Trust", "Provider POV"],
    "transfer-initialization": ["Provider POV", "Platform"],
    "data-retrieval": ["Consumer POV", "Verifier POV"],
    "interoperability-findings": ["Verifier POV", "Platform"],
  };
  return actors[step.id] ?? [roleLabels[step.role]];
}

function stepMiniSteps(step: WizardStepDefinition) {
  const miniSteps: Record<string, string[]> = {
    "identity-verification": ["Check participant services", "Confirm trust services respond", "Record readiness evidence"],
    "catalog-discovery": ["Ask for available offers", "Read catalog response", "Extract asset and offer IDs"],
    "offer-selection": ["Review discovered offer", "Confirm policy terms", "Prepare access request"],
    "contract-negotiation": ["Submit access request", "Create negotiation", "Wait for agreement"],
    "policy-validation": ["Poll agreement state", "Check trust and policy result", "Confirm agreement ID"],
    "transfer-initialization": ["Start controlled exchange", "Create transfer process", "Wait for transfer state"],
    "data-retrieval": [
      "Check open dataflow metadata",
      "Wait if HTTP 204 (dataflow not open yet)",
      "Use access token and fetch protected data",
    ],
    "interoperability-findings": ["Review trace", "Record finding", "Link evidence"],
  };
  return miniSteps[step.id] ?? [step.explanation, step.successCriteria];
}

function stepBusinessContext(step: WizardStepDefinition) {
  const contexts: Record<string, { userSees: string; systemDoes: string; actor: string }> = {
    "identity-verification": {
      userSees: "Participants appear ready to join a trusted exchange.",
      systemDoes: "The dashboard checks participant, data plane, IdentityHub, Vault, Issuer, and Traefik reachability.",
      actor: "Governance / Trust",
    },
    "catalog-discovery": {
      userSees: "The consumer sees which provider data offers are available.",
      systemDoes: "The consumer control plane requests the provider catalog through DSP.",
      actor: "Consumer",
    },
    "offer-selection": {
      userSees: "The selected data offer is ready for an access request.",
      systemDoes: "The dashboard keeps the asset and contract offer IDs for the next step.",
      actor: "Consumer",
    },
    "contract-negotiation": {
      userSees: "The consumer asks for access under the provider's terms.",
      systemDoes: "The control plane starts contract negotiation with the selected policy offer.",
      actor: "Consumer and Provider",
    },
    "policy-validation": {
      userSees: "The dashboard shows whether access is allowed.",
      systemDoes: "The platform polls negotiation state until policy and trust checks produce an agreement.",
      actor: "Governance / Trust",
    },
    "transfer-initialization": {
      userSees: "The approved exchange starts.",
      systemDoes: "The consumer control plane creates a transfer process linked to the agreement.",
      actor: "Platform",
    },
    "data-retrieval": {
      userSees: "A short wait may appear while the data plane opens the proxy flow; then the requested data result appears.",
      systemDoes:
        "The dashboard reads open dataflow metadata from the consumer data plane. HTTP 204 means the transfer exists but the proxy flow is not open yet — the platform waits and retries before fetching data.",
      actor: "Consumer",
    },
  };
  return contexts[step.id] ?? { userSees: step.outcomeSummary, systemDoes: step.explanation, actor: roleLabels[step.role] };
}

function stepDssc(step: WizardStepDefinition) {
  const mapping: Record<string, { buildingBlock: string; protocol: string; serviceDefinition: string; auditCriteria: string }> = {
    "identity-verification": {
      buildingBlock: "Trust Framework; Identity & Attestation Management",
      protocol: "DID Core; Verifiable Credentials; OAuth 2.0",
      serviceDefinition: "Participant Agent Services; Credential Verification Service",
      auditCriteria: "Participant trust must be reachable and auditable before protected exchange starts.",
    },
    "catalog-discovery": {
      buildingBlock: "Publication & Discovery; Data & Service Descriptions",
      protocol: "DCAT; JSON-LD; Dataspace Protocol",
      serviceDefinition: "Catalogue Service",
      auditCriteria: "Catalog responses must identify assets, offers, and the provider endpoint clearly.",
    },
    "contract-negotiation": {
      buildingBlock: "Access & Usage Policies Enforcement",
      protocol: "ODRL; Dataspace Protocol",
      serviceDefinition: "Contract Management Service",
      auditCriteria: "Agreement creation must be linked to the selected asset, participant, and policy.",
    },
    "policy-validation": {
      buildingBlock: "Policy Decision and Enforcement",
      protocol: "ODRL",
      serviceDefinition: "Policy Decision Service",
      auditCriteria: "Denied or terminated negotiations must be explainable from policy evidence.",
    },
    "transfer-initialization": {
      buildingBlock: "Data Exchange",
      protocol: "HTTP Pull; Dataspace Protocol",
      serviceDefinition: "Data Exchange Service",
      auditCriteria: "Transfers must be linked to a valid agreement and controlled exchange path.",
    },
    "data-retrieval": {
      buildingBlock: "Data Exchange; Policy Enforcement",
      protocol: "OAuth 2.0 Bearer; HTTP",
      serviceDefinition: "Policy Enforcement Service",
      auditCriteria: "Data access requires a valid token or endpoint reference and must be logged.",
    },
  };
  return (
    mapping[step.id] ?? {
      buildingBlock: "Interoperability Evidence",
      protocol: "EDC / DSSC mapping",
      serviceDefinition: "Validation Reporting",
      auditCriteria: "Findings must be linked to traces and understandable by technical and non-technical reviewers.",
    }
  );
}

function ScenarioInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function ActorChip({ actor }: { actor: string }) {
  const lower = actor.toLowerCase();
  const color = lower.includes("provider")
    ? "bg-emerald-400/15 text-emerald-100"
    : lower.includes("governance") || lower.includes("trust") || lower.includes("agreement")
      ? "bg-amber-400/15 text-amber-100"
      : lower.includes("verifier")
        ? "bg-purple-400/15 text-purple-100"
        : "bg-sky-400/15 text-sky-100";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${color}`}>{actor}</span>;
}
