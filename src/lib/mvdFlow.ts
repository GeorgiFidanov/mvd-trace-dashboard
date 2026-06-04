import type { MvdConfig } from "./types";

export const EDC_CONTEXT = "https://w3id.org/edc/connector/management/v2";
export const DSP_PROTOCOL = "dataspace-protocol-http:2025-1";

export const defaultConfig: MvdConfig = {
  consumerControlPlaneUrl: process.env.MVD_CONSUMER_CP_URL ?? "http://cp.consumer.localhost",
  providerControlPlaneUrl: process.env.MVD_PROVIDER_CP_URL ?? "http://cp.provider.localhost",
  consumerDataPlaneUrl: process.env.MVD_CONSUMER_DP_URL ?? "http://dp.consumer.localhost",
  providerDspUrl:
    process.env.MVD_PROVIDER_DSP_URL ??
    "http://controlplane.provider.svc.cluster.local:8082/api/dsp/2025-1",
  providerId:
    process.env.MVD_PROVIDER_ID ??
    "did:web:identityhub.provider.svc.cluster.local%3A7083:provider",
  consumerIdentityHubUrl: process.env.MVD_CONSUMER_IH_URL ?? "http://ih.consumer.localhost/cs",
  providerIdentityHubUrl: process.env.MVD_PROVIDER_IH_URL ?? "http://ih.provider.localhost/cs",
  issuerUrl: process.env.MVD_ISSUER_URL ?? "http://issuer.localhost/admin",
  apiKeyHeader: process.env.MVD_API_KEY_HEADER ?? "X-Api-Key",
  apiKeyValue: process.env.MVD_API_KEY_VALUE ?? "password",
  mockMode:
    process.env.MVD_MOCK_MODE === "on" || process.env.MVD_MOCK_MODE === "off"
      ? process.env.MVD_MOCK_MODE
      : "auto",
  publicApiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  clusterName: process.env.NEXT_PUBLIC_CLUSTER_NAME ?? "local-mvd",
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? "local",
  otelEndpoint: process.env.NEXT_PUBLIC_OTEL_ENDPOINT ?? "",
};

export const mvdEndpoints = {
  health: "/api/check/health",
  requestCatalog: "/api/mgmt/v4/catalog/request",
  startContractNegotiation: "/api/mgmt/v4/contractnegotiations",
  getContractNegotiation: (id: string) => `/api/mgmt/v4/contractnegotiations/${encodeURIComponent(id)}`,
  queryContractNegotiations: "/api/mgmt/v4/contractnegotiations/request",
  startTransfer: "/api/mgmt/v4/transferprocesses",
  getTransferState: (id: string) => `/api/mgmt/v4/transferprocesses/${encodeURIComponent(id)}/state`,
  queryTransferProcesses: "/api/mgmt/v4/transferprocesses/request",
  getOpenDataflows: "/api/proxy/flows",
  getOpenDataflow: (id: string) => `/api/proxy/flows/${encodeURIComponent(id)}`,
  fetchData: (id: string) => `/api/proxy/flows/${encodeURIComponent(id)}/data`,
};

export const mvdProcessSteps = [
  "requestCatalog",
  "startContractNegotiation",
  "getContractNegotiation",
  "startTransfer",
  "getTransfer",
  "getEdrOrDataflow",
  "fetchData",
] as const;

export type MvdProcessStep = (typeof mvdProcessSteps)[number];

export function apiHeaders(config: MvdConfig) {
  return {
    "Content-Type": "application/json",
    [config.apiKeyHeader]: config.apiKeyValue,
  };
}

export function buildCatalogRequest(config: MvdConfig) {
  return {
    "@context": [EDC_CONTEXT],
    "@type": "CatalogRequest",
    counterPartyAddress: config.providerDspUrl,
    counterPartyId: config.providerId,
    protocol: DSP_PROTOCOL,
    querySpec: {
      offset: 0,
      limit: 50,
    },
  };
}

export function buildContractRequest(config: MvdConfig, offerId: string, assetId = "asset-1") {
  return {
    "@context": [EDC_CONTEXT],
    "@type": "ContractRequest",
    counterPartyAddress: config.providerDspUrl,
    counterPartyId: config.providerId,
    protocol: DSP_PROTOCOL,
    policy: {
      "@type": "Offer",
      "@id": offerId,
      assigner: config.providerId,
      permission: [],
      prohibition: [],
      obligation: {
        action: "use",
        constraint: {
          leftOperand: "ManufacturerCredential.part_types",
          operator: "eq",
          rightOperand: "non_critical",
        },
      },
      target: assetId,
    },
    callbackAddresses: [],
  };
}

export function buildTransferRequest(config: MvdConfig, agreementId: string, assetId = "asset-1") {
  return {
    "@context": [EDC_CONTEXT],
    assetId,
    "@type": "TransferRequest",
    counterPartyAddress: config.providerDspUrl,
    connectorId: config.providerId,
    contractId: agreementId,
    dataDestination: {
      "@type": "DataAddress",
      type: "HttpProxy",
    },
    protocol: DSP_PROTOCOL,
    transferType: "HttpData-PULL",
  };
}

export function extractCatalogSelection(catalog: unknown, preferredAssetId = "asset-1") {
  const body = catalog as Record<string, unknown>;
  const datasets = arrayOfRecords(
    body.dataset ?? body["dcat:dataset"] ?? body["https://www.w3.org/ns/dcat#dataset"],
  );
  const dataset =
    datasets.find((item) => item["@id"] === preferredAssetId || item.id === preferredAssetId) ?? datasets[0];
  const policies = arrayOfRecords(
    dataset?.hasPolicy ?? dataset?.["odrl:hasPolicy"] ?? dataset?.["http://www.w3.org/ns/odrl/2/hasPolicy"],
  );
  const policy = policies.find(isOffer) ?? policies[0] ?? asRecord(dataset?.hasPolicy ?? dataset?.["odrl:hasPolicy"]);

  return {
    assetId: stringOrUndefined(dataset?.["@id"] ?? dataset?.id ?? dataset?.["https://w3id.org/edc/v0.0.1/ns/id"]),
    contractOfferId: findId(policy) ?? findId(dataset, isOffer),
  };
}

export function extractIds(stepName: string, body: unknown) {
  const record = asRecord(body);
  const ids: Record<string, string> = {};

  if (stepName === "requestCatalog") {
    const selection = extractCatalogSelection(body);
    if (selection.assetId) ids.assetId = selection.assetId;
    if (selection.contractOfferId) ids.contractOfferId = selection.contractOfferId;
  }

  const directMap: Record<string, string> = {
    "@id": stepName.includes("Transfer") ? "transferProcessId" : "contractNegotiationId",
    contractAgreementId: "contractAgreementId",
    state: "state",
    endpoint: "endpoint",
  };

  for (const [source, target] of Object.entries(directMap)) {
    const value = stringOrUndefined(record?.[source]);
    if (value) ids[target] = value;
  }

  return ids;
}

export function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  const list = asRecord(value)?.["@list"];
  if (list) {
    return arrayOfRecords(list);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  const record = asRecord(value);
  return record ? [record] : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function findId(value: unknown, predicate?: (record: Record<string, unknown>) => boolean): string | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  if (!predicate || predicate(record)) {
    const id = stringOrUndefined(record["@id"] ?? record.id ?? record["https://w3id.org/edc/v0.0.1/ns/id"]);
    if (id) return id;
  }

  for (const item of Object.values(record)) {
    if (Array.isArray(item)) {
      for (const child of item) {
        const id = findId(child, predicate);
        if (id) return id;
      }
      continue;
    }

    const id = findId(item, predicate);
    if (id) return id;
  }

  return undefined;
}

function isOffer(record: Record<string, unknown>) {
  const type = record["@type"] ?? record.type;
  const types = Array.isArray(type) ? type : [type];
  return types.some((item) => typeof item === "string" && item.toLowerCase().includes("offer"));
}
