import {
  apiHeaders,
  buildCatalogRequest,
  buildContractRequest,
  buildTransferRequest,
  dataPlaneProxyUrl,
  extractCatalogSelection,
  extractIds,
  isTransferReadyState,
  joinUrl,
  managementUrl,
  mvdEndpoints,
  readTransferState,
} from "./mvdFlow";
import { mockCatalog, mockDataflow, mockFinalData, mockNegotiation, mockOpenDataflows, mockTransfer } from "./mockMvd";
import { redactHeaders, redactJson } from "./redaction";
import { addTraceEvent, createTrace, getTrace, updateTrace } from "./storage";
import type { HealthCheckResult, MvdConfig, MvdStepResult, Trace, TraceEventStatus } from "./types";

type StepCall = {
  traceId?: string;
  useCaseId?: string;
  stepName: string;
  actor: string;
  target: string;
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  mockResponse: unknown;
  mockMode: MvdConfig["mockMode"];
};

export async function requestCatalog(config: MvdConfig, traceId?: string, useCaseId?: string) {
  const body = buildCatalogRequest(config);
  const result = await callMvd({
    traceId,
    useCaseId,
    stepName: "requestCatalog",
    actor: "Dashboard API",
    target: "Consumer Control Plane",
    method: "POST",
    url: joinUrl(managementUrl(config.consumerControlPlaneUrl), mvdEndpoints.requestCatalog),
    headers: apiHeaders(config),
    body,
    mockResponse: mockCatalog(),
    mockMode: config.mockMode,
  });
  const selection = extractCatalogSelection(result.data);
  result.trace = updateTrace(result.trace.id, { ...selection, status: "running" });
  return result;
}

export async function startContractNegotiation(config: MvdConfig, args: { traceId?: string; useCaseId?: string; offerId: string; assetId?: string }) {
  const body = buildContractRequest(config, args.offerId, args.assetId);
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "startContractNegotiation",
    actor: "Dashboard API",
    target: "Consumer Control Plane",
    method: "POST",
    url: joinUrl(managementUrl(config.consumerControlPlaneUrl), mvdEndpoints.startContractNegotiation),
    headers: apiHeaders(config),
    body,
    mockResponse: mockNegotiation(),
    mockMode: config.mockMode,
  });
  const id = getString(result.data, "@id");
  result.trace = updateTrace(result.trace.id, {
    assetId: args.assetId ?? result.trace.assetId,
    contractOfferId: args.offerId,
    contractNegotiationId: id ?? result.trace.contractNegotiationId,
    status: "running",
  });
  return result;
}

export async function getContractNegotiation(config: MvdConfig, args: { traceId?: string; useCaseId?: string; negotiationId: string }) {
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "getContractNegotiation",
    actor: "Dashboard API",
    target: "Consumer Control Plane",
    method: "GET",
    url: joinUrl(managementUrl(config.consumerControlPlaneUrl), mvdEndpoints.getContractNegotiation(args.negotiationId)),
    headers: apiHeaders(config),
    mockResponse: mockNegotiation(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    contractNegotiationId: args.negotiationId,
    contractAgreementId: getString(result.data, "contractAgreementId") ?? result.trace.contractAgreementId,
    status: getString(result.data, "state") === "TERMINATED" ? "error" : "running",
  });
  return result;
}

export async function startTransfer(config: MvdConfig, args: { traceId?: string; useCaseId?: string; agreementId: string; assetId?: string }) {
  const body = buildTransferRequest(config, args.agreementId, args.assetId);
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "startTransfer",
    actor: "Dashboard API",
    target: "Consumer Control Plane",
    method: "POST",
    url: joinUrl(managementUrl(config.consumerControlPlaneUrl), mvdEndpoints.startTransfer),
    headers: apiHeaders(config),
    body,
    mockResponse: mockTransfer(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    contractAgreementId: args.agreementId,
    transferProcessId: getString(result.data, "@id") ?? result.trace.transferProcessId,
    status: "running",
  });
  return result;
}

export async function getTransfer(config: MvdConfig, args: { traceId?: string; useCaseId?: string; transferProcessId: string }) {
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "getTransfer",
    actor: "Dashboard API",
    target: "Consumer Control Plane",
    method: "GET",
    url: joinUrl(managementUrl(config.consumerControlPlaneUrl), mvdEndpoints.getTransferState(args.transferProcessId)),
    headers: apiHeaders(config),
    mockResponse: mockTransfer(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    transferProcessId: args.transferProcessId,
    status: readTransferState(result.data) === "TERMINATED" ? "error" : "running",
  });
  return result;
}

export async function getEdrOrDataflow(config: MvdConfig, args: { traceId?: string; useCaseId?: string; transferProcessId?: string }) {
  const path = args.transferProcessId ? mvdEndpoints.getOpenDataflow(args.transferProcessId) : mvdEndpoints.getOpenDataflows;
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "getEdrOrDataflow",
    actor: "Dashboard API",
    target: "Consumer Data Plane",
    method: "GET",
    url: joinUrl(dataPlaneProxyUrl(config.consumerDataPlaneUrl), path),
    mockResponse: args.transferProcessId ? mockDataflow() : mockOpenDataflows(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    transferProcessId: args.transferProcessId ?? result.trace.transferProcessId,
    edrId: args.transferProcessId ?? firstKey(result.data) ?? result.trace.edrId,
    status: "running",
  });
  return result;
}

export async function getEdrDataAddress(config: MvdConfig, args: { traceId?: string; useCaseId?: string; transferProcessId: string }) {
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "getEdrDataAddress",
    actor: "Dashboard API",
    target: "Consumer Control Plane",
    method: "GET",
    url: joinUrl(managementUrl(config.consumerControlPlaneUrl), mvdEndpoints.getEdrDataAddress(args.transferProcessId)),
    headers: apiHeaders(config),
    mockResponse: mockDataflow(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    transferProcessId: args.transferProcessId,
    edrId: args.transferProcessId,
    status: "running",
  });
  return result;
}

export async function fetchData(config: MvdConfig, args: { traceId?: string; useCaseId?: string; transferProcessId: string; accessToken?: string }) {
  const headers = args.accessToken ? { Authorization: args.accessToken } : undefined;
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "fetchData",
    actor: "Dashboard API",
    target: "Consumer Data Plane",
    method: "GET",
    url: joinUrl(dataPlaneProxyUrl(config.consumerDataPlaneUrl), mvdEndpoints.fetchData(args.transferProcessId)),
    headers,
    mockResponse: mockFinalData(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    transferProcessId: args.transferProcessId,
    status: result.event.status === "success" ? "success" : "error",
  });
  return result;
}

type HealthCheckOptions = {
  service: string;
  path?: string;
  dedicatedHealthEndpoint?: boolean;
  warningStatuses?: number[];
};

export async function healthCheck(url: string, options: HealthCheckOptions): Promise<HealthCheckResult> {
  const startedAt = Date.now();
  const path = options.path ?? mvdEndpoints.health;
  const checkedUrl = path ? joinUrl(url, path) : url;
  const dedicatedHealthEndpoint = options.dedicatedHealthEndpoint ?? path.includes("/health");
  try {
    const response = await fetch(checkedUrl, { cache: "no-store" });
    const durationMs = Date.now() - startedAt;
    const healthyStatus = response.status >= 200 && response.status <= 299;
    const warningStatus = options.warningStatuses?.includes(response.status) ?? false;

    if (healthyStatus) {
      return {
        ok: true,
        state: "success",
        status: response.status,
        durationMs,
        url,
        checkedUrl,
        service: options.service,
        explanation: "Success: service is reachable.",
        detail: `${options.service} responded with HTTP ${response.status}.`,
        dedicatedHealthEndpoint,
      };
    }

    if (warningStatus) {
      return {
        ok: true,
        state: "warning",
        status: response.status,
        durationMs,
        url,
        checkedUrl,
        service: options.service,
        explanation: "Warning: service is reachable but the endpoint is not a dedicated health endpoint.",
        detail: `${options.service} responded with HTTP ${response.status}, which confirms the service can be reached even though no route matched this endpoint.`,
        dedicatedHealthEndpoint: false,
      };
    }

    return {
      ok: false,
      state: "offline",
      status: response.status,
      durationMs,
      url,
      checkedUrl,
      service: options.service,
      explanation: "Offline: connection failed, timed out, or DNS failed.",
      detail: `${options.service} responded with HTTP ${response.status}, which is not treated as a healthy response for this check.`,
      dedicatedHealthEndpoint,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      state: "offline",
      status: null,
      durationMs: Date.now() - startedAt,
      url,
      checkedUrl,
      service: options.service,
      explanation: "Offline: connection failed, timed out, or DNS failed.",
      detail: message,
      dedicatedHealthEndpoint,
      error: message,
    };
  }
}

async function callMvd(call: StepCall): Promise<MvdStepResult> {
  const trace = call.traceId ? getTrace(call.traceId) ?? createTrace({ useCaseId: call.useCaseId }) : createTrace({ useCaseId: call.useCaseId });
  if (call.useCaseId && trace.useCaseId !== call.useCaseId) {
    updateTrace(trace.id, { useCaseId: call.useCaseId });
    trace.useCaseId = call.useCaseId;
  }
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const headers = call.headers ?? {};
  const useMock = call.mockMode === "on";
  let responseStatus: number | null = 200;
  let responseBody = call.mockResponse;
  let status: TraceEventStatus = "success";
  let errorMessage: string | null = null;

  if (!useMock) {
    try {
      const response = await fetch(call.url, {
        method: call.method,
        headers,
        body: call.body ? JSON.stringify(call.body) : undefined,
        cache: "no-store",
      });
      responseStatus = response.status;
      responseBody = await parseResponse(response);
      status = response.ok ? "success" : "error";
      errorMessage = response.ok ? null : `MVD API returned ${response.status}`;
      if (call.stepName === "getEdrOrDataflow" && responseStatus === 204) {
        status = "pending";
        errorMessage =
          "HTTP 204 No Content — the transfer exists, but the consumer data plane has not opened a proxy dataflow yet.";
      }
      if (call.stepName === "getTransfer") {
        const transferState = readTransferState(responseBody);
        if (transferState === "TERMINATED") {
          status = "pending";
          errorMessage =
            "Transfer state is TERMINATED. The HTTP call succeeded, but the transfer process has already ended.";
        } else if (transferState && !isTransferReadyState(transferState)) {
          status = "pending";
          errorMessage = `Transfer state is ${transferState} — not ready for data retrieval yet.`;
        }
      }
    } catch (error) {
      if (call.mockMode === "off") {
        throw error;
      }
      status = "error";
      responseStatus = null;
      responseBody = { fallback: "mock", reason: error instanceof Error ? error.message : String(error), data: call.mockResponse };
      errorMessage = `MVD service unavailable, used mock fallback: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  const completed = Date.now();
  const data = status === "error" && responseBodyIsFallback(responseBody) ? responseBody.data : responseBody;
  const extractedIds = extractIds(call.stepName, data);
  const event = addTraceEvent({
    traceId: trace.id,
    stepName: call.stepName,
    actor: call.actor,
    target: call.target,
    method: call.method,
    url: call.url,
    requestHeadersRedacted: redactHeaders(headers),
    requestBody: redactJson(call.body ?? null),
    responseStatus,
    responseBody: redactJson(data),
    extractedIds,
    status,
    errorMessage,
    startedAt,
    completedAt: new Date(completed).toISOString(),
    durationMs: completed - started,
  });

  const result = { trace: trace as Trace, event, data, mock: useMock || responseBodyIsFallback(responseBody) };
  if (status === "error" && !responseBodyIsFallback(responseBody)) {
    throw new Error(errorMessage ?? `${call.stepName} failed`);
  }
  return result;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getString(value: unknown, key: string) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return typeof record[key] === "string" ? record[key] : undefined;
  }
  return undefined;
}

function firstKey(value: unknown) {
  if (value && typeof value === "object") {
    return Object.keys(value)[0];
  }
  return undefined;
}

function responseBodyIsFallback(value: unknown): value is { data: unknown } {
  return Boolean(value && typeof value === "object" && "fallback" in value && "data" in value);
}
