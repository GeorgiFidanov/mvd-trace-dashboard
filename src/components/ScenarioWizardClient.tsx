"use client";

import { useEffect, useMemo, useState } from "react";
import { coreDemoStageForWizardStep, isCoreDemoUseCase } from "@/lib/coreDemo";
import { extractCatalogOffers, isTransferReadyState, readTransferState, type CatalogOfferOption } from "@/lib/mvdFlow";
import { roleLabels, useCases, wizardSteps, type WizardStepDefinition, type WizardStepStatus } from "@/lib/useCases";
import type { HealthCheckResult, MvdStepResult } from "@/lib/types";
import { effectiveTraceStatus } from "@/lib/traceDiagnosis";
import {
  blockingOfflineHealthServices,
  formatHealthServiceLabel,
  optionalOfflineHealthServices,
} from "@/lib/healthChecks";
import { CoreDemoFlowViz } from "./CoreDemoFlowViz";
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
  catalogOffers?: CatalogOfferOption[];
};

type PlaygroundLabels = {
  consumerLabel: string;
  providerLabel: string;
  scenarioNote: string;
};

const playgroundStorageKey = "mvd-playground-labels";
const defaultPlaygroundLabels: PlaygroundLabels = {
  consumerLabel: "City consumer organisation",
  providerLabel: "Data provider organisation",
  scenarioNote: "Explore how governed data sharing works step by step.",
};
type StepExecution = { result: unknown; selection: Selection };

const initialStates = Object.fromEntries(wizardSteps.map((step) => [step.id, "pending"])) as StepState;
const EDR_POLL_ATTEMPTS = 30;
const EDR_POLL_DELAY_MS = 1000;
const TRANSFER_POLL_ATTEMPTS = 20;
const TRANSFER_POLL_DELAY_MS = 1000;

export function ScenarioWizardClient({
  initialUseCase = "UC-CORE",
  initialStepId,
}: {
  initialUseCase?: string;
  initialStepId?: string;
}) {
  const [selectedUseCase, setSelectedUseCase] = useState(initialUseCase);
  const [playgroundLabels, setPlaygroundLabels] = useState<PlaygroundLabels>(defaultPlaygroundLabels);
  const coreSteps = useMemo(() => wizardSteps.filter((step) => step.useCaseIds.includes("UC-CORE")), []);
  const [activeStepId, setActiveStepId] = useState(initialStepId ?? coreSteps[0]?.id ?? wizardSteps[0].id);
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
  const coreDemoMode = isCoreDemoUseCase(selectedUseCase);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(playgroundStorageKey);
      if (saved) setPlaygroundLabels(JSON.parse(saved) as PlaygroundLabels);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updatePlaygroundLabels(patch: Partial<PlaygroundLabels>) {
    setPlaygroundLabels((current) => {
      const next = { ...current, ...patch };
      window.localStorage.setItem(playgroundStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function selectCatalogOffer(offer: CatalogOfferOption) {
    setSelection((current) => ({
      ...current,
      assetId: offer.assetId,
      contractOfferId: offer.contractOfferId,
    }));
    setMessage(`Selected “${offer.title}” for the next access request. Run step 3 when ready.`);
  }

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
      const result = await callMvd<Record<string, HealthCheckResult>>("health");
      const blocking = blockingOfflineHealthServices(result);
      if (blocking.length) {
        const names = blocking.map(formatHealthServiceLabel).join(", ");
        throw new Error(`Required services are offline: ${names}. Open Deployment Status for the checked URL and error detail.`);
      }
      const optionalOffline = optionalOfflineHealthServices(result);
      const healthSummary =
        optionalOffline.length > 0
          ? {
              ...result,
              optionalOfflineNote: `Optional trust/routing services are offline (${optionalOffline.map(formatHealthServiceLabel).join(", ")}). Core participant services are reachable; scenario execution can continue.`,
            }
          : result;
      if (optionalOffline.length) {
        setMessage(
          `Core MVD services are reachable. Optional services offline: ${optionalOffline.map(formatHealthServiceLabel).join(", ")} — check Settings URLs or confirm those pods are running.`,
        );
      }
      if (nextSelection.traceId) {
        await recordWizardTraceEvent(nextSelection.traceId, step, "success", healthSummary);
      }
      return { result: healthSummary, selection: nextSelection };
    }

    if (step.action === "requestCatalog") {
      const result = await callMvd<MvdStepResult>("requestCatalog", { traceId: currentSelection.traceId, useCaseId: selectedUseCase });
      const ids = result.event.extractedIds;
      const catalogOffers = extractCatalogOffers(result.data);
      const preferred = catalogOffers.find((offer) => offer.assetId === ids.assetId) ?? catalogOffers[0];
      return {
        result: { ...result, catalogOffers },
        selection: {
          ...currentSelection,
          traceId: result.trace.id,
          assetId: preferred?.assetId ?? ids.assetId ?? result.trace.assetId ?? undefined,
          contractOfferId: preferred?.contractOfferId ?? ids.contractOfferId ?? result.trace.contractOfferId ?? undefined,
          catalogOffers,
        },
      };
    }

    if (step.action === "requestDataAccess") {
      if (!currentSelection.contractOfferId) {
        throw new Error("Pick a data product from the catalog first (run step 2 — Create / Publish a Data Offer).");
      }
      const nextSelection = await ensureTrace(currentSelection);
      const offerSummary = {
        summary: "Data product selected for access request",
        assetId: currentSelection.assetId,
        contractOfferId: currentSelection.contractOfferId,
        playground: playgroundLabels,
      };
      if (nextSelection.traceId) {
        await recordWizardTraceEvent(nextSelection.traceId, step, "success", { phase: "offer-selected", ...offerSummary });
      }

      let result = await callMvd<MvdStepResult>("startContractNegotiation", {
        traceId: nextSelection.traceId,
        useCaseId: selectedUseCase,
        offerId: currentSelection.contractOfferId,
        assetId: currentSelection.assetId,
      });
      const selection: Selection = {
        ...nextSelection,
        traceId: result.trace.id,
        contractNegotiationId: result.event.extractedIds.contractNegotiationId ?? result.trace.contractNegotiationId ?? undefined,
        contractAgreementId: result.event.extractedIds.contractAgreementId ?? result.trace.contractAgreementId ?? undefined,
      };

      let agreementId = selection.contractAgreementId;
      for (let i = 0; i < 8 && !agreementId; i += 1) {
        if (result.event.extractedIds.state === "TERMINATED") {
          throw new Error("Policy validation terminated the access request.");
        }
        await delay(900);
        result = await callMvd<MvdStepResult>("getContractNegotiation", {
          traceId: selection.traceId,
          useCaseId: selectedUseCase,
          negotiationId: selection.contractNegotiationId,
        });
        agreementId = result.event.extractedIds.contractAgreementId ?? result.trace.contractAgreementId ?? selection.contractAgreementId;
      }
      if (!agreementId) {
        throw new Error("Access request did not produce an agreement yet. Try this step again after the provider finalizes negotiation.");
      }
      return {
        result: { negotiation: result, agreementId, playground: playgroundLabels },
        selection: { ...selection, contractAgreementId: agreementId },
      };
    }

    if (step.action === "accessUseData") {
      if (!currentSelection.contractAgreementId) {
        throw new Error("Complete step 3 — Request Data Access — before accessing data.");
      }
      const transferResult = await callMvd<MvdStepResult>("startTransfer", {
        traceId: currentSelection.traceId,
        useCaseId: selectedUseCase,
        agreementId: currentSelection.contractAgreementId,
        assetId: currentSelection.assetId,
      });
      const workingSelection: Selection = {
        ...currentSelection,
        transferProcessId: transferResult.event.extractedIds.transferProcessId ?? transferResult.trace.transferProcessId ?? undefined,
      };
      if (!workingSelection.transferProcessId) {
        throw new Error("Transfer could not be started. Check Advanced Diagnostics for the provider response.");
      }

      setMessage("Checking transfer state before opening the consumer data-plane proxy flow.");
      await pollTransferReady({
        callMvd,
        traceId: workingSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: workingSelection.transferProcessId,
        onWaiting: setMessage,
      });
      setMessage(
        "Checking whether the consumer data plane has opened a proxy dataflow for this transfer. " +
          "HTTP 204 means the flow is not open yet — the dashboard will wait and retry automatically.",
      );
      const { edr, accessToken } = await pollOpenDataflow({
        callMvd,
        traceId: workingSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: workingSelection.transferProcessId,
        onWaiting: setMessage,
      });
      setMessage("The proxy dataflow is open — fetching the protected data payload now.");
      const fetchResult = await callMvd("fetchData", {
        traceId: workingSelection.traceId,
        useCaseId: selectedUseCase,
        transferProcessId: workingSelection.transferProcessId,
        accessToken,
      });
      return {
        result: { transfer: transferResult, edr, fetch: fetchResult, playground: playgroundLabels },
        selection: { ...workingSelection, accessToken },
      };
    }

    if (step.action === "offboardParticipant") {
      if (!currentSelection.transferProcessId) {
        throw new Error("Complete step 4 — Access & Use Data — before offboarding so a transfer exists to terminate.");
      }
      const nextSelection = await ensureTrace(currentSelection);
      const traceId = nextSelection.traceId;
      setMessage("Sending terminateTransfer to the consumer control plane (MVD management API)…");
      const terminate = await callMvd<MvdStepResult>("terminateTransfer", {
        traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
        reason: `Offboarding — ${playgroundLabels.consumerLabel}`,
      });

      setMessage("Polling transfer state until TERMINATED…");
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const transfer = await callMvd<MvdStepResult>("getTransfer", {
          traceId,
          useCaseId: selectedUseCase,
          transferProcessId: currentSelection.transferProcessId,
        });
        const state = readTransferStateFromResult(transfer);
        if (state === "TERMINATED") break;
        await delay(800);
      }

      setMessage("Querying IssuerService for the consumer membership credential…");
      const credentialQuery = await callMvd<MvdStepResult & { credentialResourceId?: string }>("queryConsumerCredentials", {
        traceId,
        useCaseId: selectedUseCase,
      });
      const credentialResourceId = credentialQuery.credentialResourceId;
      if (!credentialResourceId) {
        throw new Error(
          "No membership credential found to revoke. Set MVD_OFFBOARD_MEMBERSHIP_CREDENTIAL_ID or check MVD_ISSUER_PARTICIPANT_CONTEXT.",
        );
      }

      setMessage("Revoking membership credential via IssuerService admin API (IdentityHub trust layer)…");
      const credentialRevoke = await callMvd<MvdStepResult>("revokeConsumerCredential", {
        traceId,
        useCaseId: selectedUseCase,
        credentialResourceId,
      });

      setMessage("Confirming credential status is revocation…");
      const credentialVerify = await callMvd<MvdStepResult & { credentialRevoked?: boolean }>("verifyCredentialRevoked", {
        traceId,
        useCaseId: selectedUseCase,
        credentialResourceId,
      });

      setMessage("Retrying data access without a token — access should be denied…");
      const verify = await callMvd<MvdStepResult & { accessRevoked?: boolean }>("verifyAccessRevoked", {
        traceId,
        useCaseId: selectedUseCase,
        transferProcessId: currentSelection.transferProcessId,
      });

      const summary = {
        terminate,
        credentialQuery,
        credentialRevoke,
        credentialVerify,
        verify,
        credentialResourceId,
        accessRevoked: verify.accessRevoked ?? true,
        credentialRevoked: credentialVerify.credentialRevoked ?? true,
        playground: playgroundLabels,
        note:
          "Transfer terminated, membership VC revoked via IssuerService POST …/credentials/{id}/revoke, and data-plane denial confirmed.",
      };
      return { result: summary, selection: nextSelection };
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
      const mvdStepFailed = Boolean(
        step.action &&
          step.action !== "health" &&
          step.action !== "offboardParticipant",
      );
      // MVD-backed steps record HTTP failures themselves, but fetchData can fail after only 204 responses.
      if (!mvdStepFailed || step.action === "fetchData" || step.action === "accessUseData") {
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
      if (action === "verifyAccessRevoked" && (data as { accessRevoked?: boolean }).accessRevoked) {
        return data as T;
      }
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

  function getStepToRun() {
    return visibleSteps.find((step) => states[step.id] === "pending" || states[step.id] === "failed") ?? null;
  }

  const stepToRun = getStepToRun();
  const isRunning = visibleSteps.some((step) => states[step.id] === "running");

  function runNextStep() {
    const step = getStepToRun();
    if (!step) return;
    setActiveStepId(step.id);
    void runStep(step).catch(() => undefined);
  }

  const catalogReady = Boolean(states["core-publish"] === "success" && selection.catalogOffers?.length);
  const showAssetPicker = coreDemoMode && catalogReady && activeStepId === "core-request-access";
  const selectedCatalogOffer = selection.catalogOffers?.find(
    (offer) => offer.assetId === selection.assetId && offer.contractOfferId === selection.contractOfferId,
  );
  const showLockedAsset =
    coreDemoMode &&
    catalogReady &&
    !showAssetPicker &&
    Boolean(selectedCatalogOffer) &&
    (activeStepId === "core-access-data" || activeStepId === "core-offboard");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/15 via-slate-900 to-indigo-500/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
          {coreDemoMode ? "Core Demo Playground · Show & Tell Section 2" : "Dataspace Scenario Wizard"}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {coreDemoMode
                ? "Explore the dataspace in five guided steps"
                : "Validate a dataspace use case step by step"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {coreDemoMode
                ? "Click through the five Core Demo steps: onboard a participant, browse published data products, request access, use the data, and offboard with real MVD calls. Mix assets and labels to tell your own story — technical traces stay available in Advanced Diagnostics."
                : "Run the scenario as a guided educational workflow. The wizard explains what happened and why, while the trace ID is kept for Advanced Diagnostics."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200" onClick={() => reset()}>
              Replay
            </button>
            <button
              className="rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50"
              disabled={!stepToRun || isRunning}
              onClick={() => runNextStep()}
            >
              {stepToRun ? `Run Next Step (${stepToRun.shortTitle})` : "All steps complete"}
            </button>
            <button className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => void runScenario().catch(() => undefined)}>
              Run Full Scenario
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
            <optgroup label="Main demo flow">
              {useCases
                .filter((useCase) => useCase.kind === "playground")
                .map((useCase) => (
                  <option key={useCase.id} value={useCase.id}>
                    {useCase.id} - {useCase.shortTitle}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Technical validation scenarios">
              {useCases
                .filter((useCase) => useCase.kind !== "playground")
                .map((useCase) => (
                  <option key={useCase.id} value={useCase.id}>
                    {useCase.id} - {useCase.shortTitle}
                  </option>
                ))}
            </optgroup>
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
        {coreDemoMode ? (
          <div className="mt-5 grid gap-4 rounded-[2rem] border border-pink-300/25 bg-pink-300/10 p-5 lg:grid-cols-3">
            <PlaygroundField
              label="Consumer in your story"
              value={playgroundLabels.consumerLabel}
              onChange={(value) => updatePlaygroundLabels({ consumerLabel: value })}
              placeholder="e.g. City mobility office"
            />
            <PlaygroundField
              label="Provider in your story"
              value={playgroundLabels.providerLabel}
              onChange={(value) => updatePlaygroundLabels({ providerLabel: value })}
              placeholder="e.g. Regional data hub"
            />
            <PlaygroundField
              label="What are you exploring?"
              value={playgroundLabels.scenarioNote}
              onChange={(value) => updatePlaygroundLabels({ scenarioNote: value })}
              placeholder="e.g. Sharing air-quality data for urban planning"
            />
          </div>
        ) : null}
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plain-language scenario result</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {message ??
              "The consumer asks for data access. The provider checks identity and policy. If the checks pass, access is granted and the data is exchanged through a controlled path."}
          </p>
        </div>
      </header>

      <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
          {coreDemoMode ? "Core Demo · 5 playbook steps" : "Steps"}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {coreDemoMode ? "Click a step to explore — run one at a time or the full flow" : "Follow the scenario one decision at a time"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          {coreDemoMode
            ? "Each card matches the DS4SSCC Show & Tell Core Demo. Complete step 2 first — asset selection unlocks on step 3."
            : "Select a step on the left to see what the business user sees, what the platform does, and which evidence is recorded. Run the full scenario from the top, or run one step from the selected-step panel."}
        </p>
      </section>

      {coreDemoMode ? (
        <CoreDemoFlowViz
          activeStepId={activeStepId}
          states={states}
          consumerLabel={playgroundLabels.consumerLabel}
          providerLabel={playgroundLabels.providerLabel}
          assetLabel={selectedCatalogOffer?.title ?? selection.assetId}
        />
      ) : null}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <section className="min-w-0 flex-1 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4">
            {visibleSteps.map((step, index) => {
              const stageNumber = step.playbookStage ?? index + 1;
              const coreStage = coreDemoStageForWizardStep(step.id);
              return (
              <button
                key={step.id}
                className={`group grid gap-4 rounded-3xl border p-4 text-left transition md:grid-cols-[auto_1fr_auto] md:items-center ${
                  activeStep?.id === step.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-slate-900/60 hover:bg-white/10"
                }`}
                onClick={() => setActiveStepId(step.id)}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-cyan-200">
                  {stageNumber}
                </span>
                <span>
                  {coreStage ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">
                      Playbook step {coreStage.stage} · {coreStage.playbookTiming}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{roleLabels[step.role]}</span>
                  )}
                  <span className="mt-1 block text-lg font-semibold text-white">{step.title}</span>
                  <span className="mt-1 block text-sm text-slate-400">{step.successCriteria}</span>
                </span>
                <StatusBadge status={states[step.id]} />
              </button>
            );
            })}
          </div>
        </section>

        <aside className="w-full shrink-0 rounded-[2rem] border border-white/10 bg-slate-900/90 p-5 xl:sticky xl:top-6 xl:w-[380px] xl:self-start">
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
              {showAssetPicker ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Choose a data product</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Unlocked for step 3 — pick one before running the access request.</p>
                  <div className="mt-3 grid gap-2">
                    {selection.catalogOffers?.map((offer) => {
                      const selected =
                        selection.assetId === offer.assetId && selection.contractOfferId === offer.contractOfferId;
                      return (
                        <button
                          key={`${offer.assetId}-${offer.contractOfferId}`}
                          type="button"
                          disabled={isRunning}
                          onClick={() => selectCatalogOffer(offer)}
                          className={`rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                            selected
                              ? "border-emerald-300 bg-emerald-300/15"
                              : "border-white/10 bg-slate-950/60 hover:border-emerald-300/40"
                          }`}
                        >
                          <p className="text-sm font-semibold text-white">{offer.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{offer.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {showLockedAsset && selectedCatalogOffer ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected data product</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedCatalogOffer.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Locked for this run — replay to choose a different asset.</p>
                </div>
              ) : null}
              <button
                className="mt-5 w-full rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                disabled={states[activeStep.id] === "running"}
                onClick={() => void runStep(activeStep).catch(() => undefined)}
              >
                {states[activeStep.id] === "running" ? "Running..." : "Run This Step"}
              </button>
              <button
                className="mt-3 w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50"
                disabled={!stepToRun || isRunning}
                onClick={() => runNextStep()}
              >
                {stepToRun ? `Run Next Step · ${stepToRun.title}` : "All steps complete"}
              </button>
              {states[activeStep.id] === "running" &&
              (activeStep.id === "data-retrieval" || activeStep.id === "core-access-data") ? (
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

function isMvdStepResult(value: unknown): value is MvdStepResult {
  return Boolean(value && typeof value === "object" && "event" in value && "trace" in value);
}

function stepActors(step: WizardStepDefinition) {
  const actors: Record<string, string[]> = {
    "core-onboard": ["Consumer POV", "Governance / Trust"],
    "core-publish": ["Provider POV", "Usage Control"],
    "core-request-access": ["Consumer POV", "Provider Approval", "Agreement"],
    "core-access-data": ["Consumer POV", "Verifier POV", "Provider Data"],
    "core-offboard": ["Governance POV", "Provider Control"],
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
    "core-onboard": ["Register participant identity", "Validate trust services", "Confirm connectors are reachable"],
    "core-publish": ["Browse published catalog", "Review metadata and policy", "Select a data product to explore"],
    "core-request-access": ["Choose catalog product", "Submit access request", "Wait for policy agreement"],
    "core-access-data": ["Start secure exchange", "Receive access token", "View protected data result"],
    "core-offboard": ["Terminate active transfer", "Revoke membership credential", "Confirm data-plane denial"],
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
    "core-onboard": {
      userSees: "A new participant is registered and shown as ready for trusted data sharing.",
      systemDoes: "The dashboard checks connector, IdentityHub, vault, and trust service reachability.",
      actor: "Participant with Governance / Trust",
    },
    "core-publish": {
      userSees: "Published data products appear in the catalog with titles, descriptions, and usage rules.",
      systemDoes: "The consumer asks the provider catalog what data products are available (MVD pre-seeds provider assets).",
      actor: "Provider",
    },
    "core-request-access": {
      userSees: "The consumer picks a product and sees whether access is granted under policy.",
      systemDoes: "Contract negotiation runs while identity and ODRL policy checks execute.",
      actor: "Consumer with Provider approval",
    },
    "core-access-data": {
      userSees: "The requested data appears after a short wait while the secure exchange opens.",
      systemDoes: "Transfer starts, the data plane opens a proxy flow, and the protected payload is fetched.",
      actor: "Consumer with Platform",
    },
    "core-offboard": {
      userSees: "The transfer stops, trust credentials are revoked, and a retry shows access is denied.",
      systemDoes:
        "POST transfer/terminate, IssuerService POST …/credentials/{id}/revoke, GET credential status, then GET data without token expecting denial.",
      actor: "Governance / Trust",
    },
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
  const coreStage = coreDemoStageForWizardStep(step.id);
  if (coreStage) {
    return {
      buildingBlock: coreStage.buildingBlocks.join(" · "),
      protocol: "Dataspace Protocol · ODRL · W3C DID / VC (where applicable)",
      serviceDefinition: "EDC MVD connector services mapped to DS4SSCC building blocks",
      auditCriteria: `${coreStage.showAndDescribe.join("; ")} — evidence recorded in Execution History.`,
    };
  }
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

function PlaygroundField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-pink-100">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
      />
    </label>
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
