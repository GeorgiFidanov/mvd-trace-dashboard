import type { TraceEvent, TraceStatus } from "./types";

export function effectiveTraceStatus(status: TraceStatus, events: TraceEvent[]): TraceStatus {
  if (events.some((event) => event.status === "error")) return "error";
  return status;
}

const WIZARD_STEP_TO_MVD: Record<string, string> = {
  "data-retrieval": "fetchData",
  "catalog-discovery": "requestCatalog",
  "contract-negotiation": "startContractNegotiation",
  "policy-validation": "getContractNegotiation",
  "transfer-initialization": "startTransfer",
};

/** Wizard failures for data retrieval should stay visible even when no fetchData MVD call was recorded. */
const KEEP_WIZARD_ON_MVD_FAILURE = new Set(["data-retrieval"]);

const RETRY_COLLAPSE_STEPS = new Set(["getEdrOrDataflow", "getEdrDataAddress", "fetchData", "getTransfer"]);

/** Hides wizard duplicates and earlier retry attempts from the diagnostics UI. */
export function displayTraceEvents(events: TraceEvent[]): TraceEvent[] {
  const mvdStepNames = new Set(events.filter((event) => event.method !== "WIZARD").map((event) => event.stepName));
  const withoutWizardDupes = events.filter((event) => {
    const isWizardEvent = event.method === "WIZARD" || event.actor === "Dashboard user";
    if (!isWizardEvent) return true;
    const equivalent = WIZARD_STEP_TO_MVD[event.stepName];
    if (KEEP_WIZARD_ON_MVD_FAILURE.has(event.stepName) && event.status === "error") return true;
    return !equivalent || !mvdStepNames.has(equivalent);
  });

  const lastRetryIndex = new Map<string, number>();
  withoutWizardDupes.forEach((event, index) => {
    if (RETRY_COLLAPSE_STEPS.has(event.stepName)) {
      lastRetryIndex.set(event.stepName, index);
    }
  });

  return withoutWizardDupes.filter((event, index) => {
    if (!RETRY_COLLAPSE_STEPS.has(event.stepName)) return true;
    return lastRetryIndex.get(event.stepName) === index;
  });
}

export type TraceDiagnosis = {
  title: string;
  summary: string;
  evidence: string[];
  nextSteps: string[];
};

export function diagnoseTrace(events: TraceEvent[]): TraceDiagnosis | null {
  const failed = events.find((event) => event.status === "error");
  if (failed) {
    return diagnoseFailedEvent(failed, events);
  }

  const waitingDataflow = [...events]
    .reverse()
    .find((event) => event.stepName === "getEdrOrDataflow" && event.responseStatus === 204);
  if (waitingDataflow && !events.some((event) => event.stepName === "fetchData")) {
    return {
      title: "Dataflow not open yet (HTTP 204)",
      summary:
        "The consumer data plane responded with HTTP 204 No Content. The transfer is registered, but the proxy dataflow is not open yet, so data retrieval cannot continue.",
      evidence: [
        `${waitingDataflow.method} ${waitingDataflow.url}`,
        "HTTP 204 No Content with an empty body",
        waitingDataflow.errorMessage ?? "No access token is available until the dataflow opens.",
      ],
      nextSteps: [
        "Wait for the provider transfer to reach STARTED, then run Data Retrieval again.",
        "Check consumer and provider data-plane logs for the same timestamp.",
        "If this persists, confirm the transfer process ID matches an active HttpProxy-PULL transfer.",
      ],
    };
  }

  return null;
}

function diagnoseFailedEvent(failed: TraceEvent, events: TraceEvent[]): TraceDiagnosis {

  const messages = collectStrings(failed.responseBody);
  const bodyText = messages.join(" ");
  const vaultAlias = /alias:\s*([A-Za-z0-9_.:-]+)/i.exec(bodyText)?.[1];
  const credentialFailure = /Unable to obtain credentials|Failed to fetch client secret from the vault/i.test(bodyText);

  if (credentialFailure) {
    return {
      title: "Consumer connector cannot read a required Vault secret",
      summary: vaultAlias
        ? `The ${failed.stepName} step reached the ${failed.target}, but that connector failed because Vault does not return the secret alias ${vaultAlias}.`
        : `The ${failed.stepName} step reached the ${failed.target}, but that connector failed while reading credentials from Vault.`,
      evidence: [
        `${failed.stepName} returned HTTP ${failed.responseStatus ?? "no status"}.`,
        firstMatchingMessage(messages, /Unable to obtain credentials|Failed to fetch client secret/i) ?? "The response mentions a credential lookup failure.",
        vaultAlias ? `Missing or unreadable Vault alias: ${vaultAlias}.` : "The exact Vault alias was not found in the response.",
      ],
      nextSteps: [
        "Check the consumer control-plane seed job and Vault data for the missing alias.",
        vaultAlias ? `Verify that ${vaultAlias} exists in the consumer Vault and contains the expected STS client secret.` : "Verify the STS client secret aliases in the consumer Vault.",
        "After fixing Vault or rerunning the seed job, run Catalog Discovery again.",
      ],
    };
  }

  if (failed.stepName === "data-retrieval" && /HTTP 204|proxy dataflow never opened|access token/i.test(failed.errorMessage ?? "")) {
    return {
      title: "Data retrieval timed out waiting for the proxy dataflow",
      summary:
        "Data retrieval failed because the consumer data plane kept returning HTTP 204 No Content. The transfer exists, but the proxy flow did not open in time.",
      evidence: [
        failed.errorMessage ?? "Data retrieval failed while waiting for the dataflow.",
        events.some((event) => event.stepName === "getEdrOrDataflow" && event.responseStatus === 204)
          ? "At least one getEdrOrDataflow call returned HTTP 204 No Content."
          : "No open dataflow metadata was returned.",
      ],
      nextSteps: [
        "Confirm the transfer reached STARTED on the provider side.",
        "Wait a few seconds, then run Data Retrieval again from the Scenario Wizard.",
        "Check consumer data-plane logs for proxy flow creation errors.",
      ],
    };
  }

  return {
    title: `${failed.stepName} failed`,
    summary: `The dashboard reached ${failed.target}, but the backend returned HTTP ${failed.responseStatus ?? "no status"}.`,
    evidence: [
      `${failed.method} ${failed.url}`,
      failed.errorMessage ?? `HTTP ${failed.responseStatus ?? "no status"}`,
      firstUsefulMessage(messages) ?? "No detailed backend message was found in the response body.",
    ],
    nextSteps: [
      "Open the failed step below and inspect the response body.",
      "Check the target service logs for the same timestamp.",
      "Rerun only the failed step after the backend issue is fixed.",
    ],
  };
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

function firstMatchingMessage(messages: string[], pattern: RegExp) {
  return messages.find((message) => pattern.test(message));
}

function firstUsefulMessage(messages: string[]) {
  return messages.find((message) => message.length > 12);
}
