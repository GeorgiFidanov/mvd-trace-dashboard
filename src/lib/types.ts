export type TraceStatus = "idle" | "running" | "success" | "error";
export type TraceEventStatus = "pending" | "success" | "error";

export type MvdConfig = {
  consumerControlPlaneUrl: string;
  providerControlPlaneUrl: string;
  consumerDataPlaneUrl: string;
  providerDspUrl: string;
  providerId: string;
  consumerIdentityHubUrl: string;
  providerIdentityHubUrl: string;
  issuerUrl: string;
  apiKeyHeader: string;
  apiKeyValue: string;
  mockMode: "auto" | "on" | "off";
  publicApiUrl: string;
  clusterName: string;
  environment: string;
  otelEndpoint: string;
};

export type Trace = {
  id: string;
  createdAt: string;
  updatedAt: string;
  assetId: string | null;
  contractOfferId: string | null;
  contractNegotiationId: string | null;
  contractAgreementId: string | null;
  transferProcessId: string | null;
  edrId: string | null;
  useCaseId: string | null;
  status: TraceStatus;
};

export type TraceEvent = {
  id: string;
  traceId: string;
  stepName: string;
  actor: string;
  target: string;
  method: string;
  url: string;
  requestHeadersRedacted: Record<string, string>;
  requestBody: unknown;
  responseStatus: number | null;
  responseBody: unknown;
  extractedIds: Record<string, string>;
  status: TraceEventStatus;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
};

export type TraceWithEvents = Trace & {
  events: TraceEvent[];
};

export type MvdStepResult<T = unknown> = {
  trace: Trace;
  event: TraceEvent;
  data: T;
  mock: boolean;
};

export type FlowSelection = {
  assetId?: string;
  contractOfferId?: string;
  contractNegotiationId?: string;
  contractAgreementId?: string;
  transferProcessId?: string;
  edrId?: string;
  accessToken?: string;
};
