import {
  apiHeaders,
  buildCatalogRequest,
  buildContractRequest,
  buildTransferRequest,
  extractCatalogSelection,
  extractIds,
  joinUrl,
  mvdEndpoints,
} from "./mvdFlow";
import { mockCatalog, mockDataflow, mockFinalData, mockNegotiation, mockOpenDataflows, mockTransfer } from "./mockMvd";
import { redactHeaders, redactJson } from "./redaction";
import { addTraceEvent, createTrace, getTrace, updateTrace } from "./storage";
import type { MvdConfig, MvdStepResult, Trace } from "./types";

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
    url: joinUrl(config.consumerControlPlaneUrl, mvdEndpoints.requestCatalog),
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
    url: joinUrl(config.consumerControlPlaneUrl, mvdEndpoints.startContractNegotiation),
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
    url: joinUrl(config.consumerControlPlaneUrl, mvdEndpoints.getContractNegotiation(args.negotiationId)),
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
    url: joinUrl(config.consumerControlPlaneUrl, mvdEndpoints.startTransfer),
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
    url: joinUrl(config.consumerControlPlaneUrl, mvdEndpoints.getTransferState(args.transferProcessId)),
    headers: apiHeaders(config),
    mockResponse: mockTransfer(),
    mockMode: config.mockMode,
  });
  result.trace = updateTrace(result.trace.id, {
    transferProcessId: args.transferProcessId,
    status: getString(result.data, "state") === "TERMINATED" ? "error" : "running",
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
    url: joinUrl(config.consumerDataPlaneUrl, path),
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

export async function fetchData(config: MvdConfig, args: { traceId?: string; useCaseId?: string; transferProcessId: string; accessToken?: string }) {
  const headers = args.accessToken ? { Authorization: args.accessToken } : undefined;
  const result = await callMvd({
    traceId: args.traceId,
    useCaseId: args.useCaseId,
    stepName: "fetchData",
    actor: "Dashboard API",
    target: "Consumer Data Plane",
    method: "GET",
    url: joinUrl(config.consumerDataPlaneUrl, mvdEndpoints.fetchData(args.transferProcessId)),
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

export async function healthCheck(url: string) {
  const startedAt = Date.now();
  try {
    const response = await fetch(joinUrl(url, mvdEndpoints.health), { cache: "no-store" });
    return { ok: response.ok, status: response.status, durationMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, status: null, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
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
  let status: "success" | "error" = "success";
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

  return { trace: trace as Trace, event, data, mock: useMock || responseBodyIsFallback(responseBody) };
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
