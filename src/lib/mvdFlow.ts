import type { MvdConfig } from "./types";

export const EDC_CONTEXT = "https://w3id.org/edc/connector/management/v2";
export const DSP_PROTOCOL = "dataspace-protocol-http:2025-1";

export const defaultConfig: MvdConfig = {
  consumerControlPlaneUrl:
    process.env.MVD_CONSUMER_CP_URL ?? "http://controlplane.consumer.svc.cluster.local:8080",
  providerControlPlaneUrl:
    process.env.MVD_PROVIDER_CP_URL ?? "http://controlplane.provider.svc.cluster.local:8080",
  consumerDataPlaneUrl:
    process.env.MVD_CONSUMER_DP_URL ?? "http://dataplane.consumer.svc.cluster.local:8080",
  providerDataPlaneUrl:
    process.env.MVD_PROVIDER_DP_URL ?? "http://dataplane.provider.svc.cluster.local:8080",
  providerDspUrl:
    process.env.MVD_PROVIDER_DSP_URL ??
    "http://controlplane.provider.svc.cluster.local:8082/api/dsp/2025-1",
  providerId:
    process.env.MVD_PROVIDER_ID ??
    "did:web:identityhub.provider.svc.cluster.local%3A7083:provider",
  consumerId:
    process.env.MVD_CONSUMER_ID ??
    "did:web:identityhub.consumer.svc.cluster.local%3A7083:consumer",
  issuerParticipantContext: process.env.MVD_ISSUER_PARTICIPANT_CONTEXT ?? "issuer",
  consumerIdentityHubUrl:
    process.env.MVD_CONSUMER_IH_URL ?? "http://identityhub.consumer.svc.cluster.local:7083",
  providerIdentityHubUrl:
    process.env.MVD_PROVIDER_IH_URL ?? "http://identityhub.provider.svc.cluster.local:7083",
  providerVaultUrl:
    process.env.MVD_PROVIDER_VAULT_URL ?? "http://vault.provider.svc.cluster.local:8200/v1/sys/health",
  issuerUrl:
    process.env.MVD_ISSUER_URL ??
    "http://issuerservice.issuer.svc.cluster.local:10013/api/admin/v1alpha",
  issuerHealthUrl:
    process.env.MVD_ISSUER_HEALTH_URL ??
    "http://issuerservice.issuer.svc.cluster.local:10010",
  keycloakUrl: process.env.MVD_KEYCLOAK_URL ?? "http://keycloak.mvd-common.svc.cluster.local:8080",
  keycloakRealm: process.env.MVD_KEYCLOAK_REALM ?? "mvd",
  issuerOAuthClientId: process.env.MVD_ISSUER_OAUTH_CLIENT_ID ?? "issuer",
  issuerOAuthClientSecret: process.env.MVD_ISSUER_OAUTH_CLIENT_SECRET ?? "issuer-secret",
  traefikUrl: process.env.MVD_TRAEFIK_URL ?? "http://traefik.traefik.svc.cluster.local:80",
  apiKeyHeader: process.env.MVD_API_KEY_HEADER ?? "X-Api-Key",
  apiKeyValue: process.env.MVD_API_KEY_VALUE ?? "password",
  mockMode:
    process.env.MVD_MOCK_MODE === "on" || process.env.MVD_MOCK_MODE === "off"
      ? process.env.MVD_MOCK_MODE
      : "off",
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
  /** MVD 0.17+ stores EDR on consumer control-plane management API when proxy flow is not open yet. */
  getEdrDataAddress: (id: string) => `/api/mgmt/v3/edrs/${encodeURIComponent(id)}/dataaddress`,
  terminateTransfer: (id: string) => `/api/mgmt/v4/transferprocesses/${encodeURIComponent(id)}/terminate`,
};

export const issuerEndpoints = {
  queryCredentials: (participantContextId: string) =>
    `/participants/${encodeURIComponent(participantContextId)}/credentials/query`,
  revokeCredential: (participantContextId: string, credentialResourceId: string) =>
    `/participants/${encodeURIComponent(participantContextId)}/credentials/${encodeURIComponent(credentialResourceId)}/revoke`,
  credentialStatus: (participantContextId: string, credentialResourceId: string) =>
    `/participants/${encodeURIComponent(participantContextId)}/credentials/${encodeURIComponent(credentialResourceId)}/status`,
};

export function buildIssuerCredentialsQuery() {
  return {};
}

export function extractCredentialResources(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  const record = asRecord(body);
  if (!record) return [];
  const nested = record.content ?? record["@graph"] ?? record.items ?? body;
  return arrayOfRecords(nested);
}

export function pickMembershipCredentialResource(credentials: Record<string, unknown>[], consumerDid: string) {
  const consumerNeedle = consumerDid.toLowerCase();
  const membership = credentials.find((item) => {
    const blob = JSON.stringify(item).toLowerCase();
    const credential = asRecord(item.credential);
    const types = credential?.type;
    const typeBlob = Array.isArray(types) ? types.join(" ").toLowerCase() : String(types ?? "").toLowerCase();
    const holder = stringOrUndefined(item.holderId ?? item.participantId ?? item.holder)?.toLowerCase() ?? "";
    const holderMatches = !consumerNeedle || !holder || holder.includes(consumerNeedle) || consumerNeedle.includes(holder);
    return holderMatches && (blob.includes("membership") || typeBlob.includes("membership"));
  });
  const candidate = membership ?? credentials[0];
  return (
    stringOrUndefined(candidate?.["@id"] ?? candidate?.id) ??
    stringOrUndefined(asRecord(candidate?.credential)?.id)
  );
}

export function readCredentialStatusLabel(body: unknown) {
  if (typeof body === "string") return body.trim().toLowerCase();
  const record = asRecord(body);
  return stringOrUndefined(record?.status ?? record?.label)?.toLowerCase();
}

/** True when a post-terminate data-plane probe shows access is blocked. */
export function isDataPlaneAccessDenied(responseStatus: number | null, body: unknown) {
  if (responseStatus !== null && responseStatus >= 400) return true;
  const record = asRecord(body);
  if (record?.denied === true) return true;
  if (record?.unreachable === true) return true;
  if (responseStatus === 204) return true;
  return false;
}

/** Offboard assertion: HTTP denial on verifyAccessRevoked is the expected passing outcome. */
export function isExpectedAccessRevocationAssertion(stepName: string, responseStatus: number | null, body: unknown) {
  return stepName === "verifyAccessRevoked" && isDataPlaneAccessDenied(responseStatus, body);
}

export function expectedAccessRevocationMessage(responseStatus: number | null) {
  return responseStatus !== null && responseStatus >= 400
    ? `Assertion passed: data plane denied access (HTTP ${responseStatus}).`
    : "Assertion passed: data plane denied access.";
}

export function managementUrl(baseUrl: string) {
  return servicePortUrl(baseUrl, "controlplane.", "8081");
}

export function dataPlaneProxyUrl(baseUrl: string) {
  return servicePortUrl(baseUrl, "dataplane.", "11003");
}

function servicePortUrl(baseUrl: string, servicePrefix: string, port: string) {
  try {
    const url = new URL(baseUrl);
    if (url.hostname.startsWith(servicePrefix) && url.hostname.endsWith(".svc.cluster.local") && url.port === "8080") {
      url.port = port;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return baseUrl;
  }
  return baseUrl;
}

export const mvdProcessSteps = [
  "requestCatalog",
  "startContractNegotiation",
  "getContractNegotiation",
  "startTransfer",
  "getTransfer",
  "getEdrOrDataflow",
  "getEdrDataAddress",
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

export function buildTerminateTransferRequest(reason = "Offboarding — revoke data access for this participant run") {
  return {
    "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
    "@type": "TerminateTransfer",
    reason,
  };
}

export function extractCatalogSelection(catalog: unknown, preferredAssetId = "asset-1") {
  const offers = extractCatalogOffers(catalog);
  const match = offers.find((offer) => offer.assetId === preferredAssetId) ?? offers[0];
  return {
    assetId: match?.assetId,
    contractOfferId: match?.contractOfferId,
  };
}

export type CatalogOfferOption = {
  assetId: string;
  contractOfferId: string;
  title: string;
  description: string;
};

export function extractCatalogOffers(catalog: unknown): CatalogOfferOption[] {
  const body = catalog as Record<string, unknown>;
  const datasets = arrayOfRecords(
    body.dataset ?? body["dcat:dataset"] ?? body["https://www.w3.org/ns/dcat#dataset"],
  );

  return datasets.flatMap((dataset) => {
    const assetId = stringOrUndefined(
      dataset["@id"] ?? dataset.id ?? dataset["https://w3id.org/edc/v0.0.1/ns/id"],
    );
    if (!assetId) return [];

    const policies = arrayOfRecords(
      dataset.hasPolicy ?? dataset["odrl:hasPolicy"] ?? dataset["http://www.w3.org/ns/odrl/2/hasPolicy"],
    );
    const policy = policies.find(isOffer) ?? policies[0] ?? asRecord(dataset.hasPolicy ?? dataset["odrl:hasPolicy"]);
    const contractOfferId = findId(policy) ?? findId(dataset, isOffer);
    if (!contractOfferId) return [];

    const title =
      stringOrUndefined(dataset.title ?? dataset["https://www.w3.org/ns/dcat#title"] ?? dataset.name) ?? assetId;
    const description =
      stringOrUndefined(
        dataset.description ?? dataset["https://www.w3.org/ns/dcat#description"] ?? dataset["dcat:description"],
      ) ?? "Published data product with attached usage policy.";

    return [{ assetId, contractOfferId, title, description }];
  });
}

export function readTransferState(body: unknown): string | undefined {
  if (typeof body === "string" && body.length > 0) return body;
  const record = asRecord(body);
  if (!record) return undefined;
  return stringOrUndefined(record.state);
}

export function isTransferReadyState(state?: string) {
  return state === "STARTED" || state === "COMPLETED" || state === "COMPLETING";
}

export function extractIds(stepName: string, body: unknown) {
  const record = asRecord(body);
  const ids: Record<string, string> = {};

  if (stepName === "requestCatalog") {
    const selection = extractCatalogSelection(body);
    if (selection.assetId) ids.assetId = selection.assetId;
    if (selection.contractOfferId) ids.contractOfferId = selection.contractOfferId;
  }

  const transferState = stepName.includes("Transfer") ? readTransferState(body) : undefined;
  if (transferState) ids.state = transferState;

  const directMap: Record<string, string> = {
    "@id": stepName.includes("Transfer") ? "transferProcessId" : "contractNegotiationId",
    contractAgreementId: "contractAgreementId",
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
