import {
  fetchData,
  getContractNegotiation,
  getEdrDataAddress,
  getEdrOrDataflow,
  getTransfer,
  healthCheck,
  requestCatalog,
  startContractNegotiation,
  startTransfer,
  terminateTransfer,
  queryConsumerCredentials,
  revokeConsumerCredential,
  verifyAccessRevoked,
  verifyCredentialRevoked,
} from "@/lib/mvdClient";
import { mockHealthChecks } from "@/lib/mockMvd";
import { getConfig } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const routeReachableStatuses = [404];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = { ...getConfig(), ...(body.config ?? {}) };

    switch (body.action) {
      case "health":
        if (config.mockMode === "on") {
          return Response.json(mockHealthChecks());
        }
        return Response.json({
          consumerControlPlane: await healthCheck(config.consumerControlPlaneUrl, { service: "Consumer Control Plane", warningStatuses: routeReachableStatuses }),
          consumerDataPlane: await healthCheck(config.consumerDataPlaneUrl, { service: "Consumer Data Plane", warningStatuses: routeReachableStatuses }),
          consumerIdentityHub: await healthCheck(config.consumerIdentityHubUrl, {
            service: "Consumer IdentityHub",
            path: "",
            dedicatedHealthEndpoint: false,
            warningStatuses: routeReachableStatuses,
          }),
          providerControlPlane: await healthCheck(config.providerControlPlaneUrl, { service: "Provider Control Plane", warningStatuses: routeReachableStatuses }),
          providerDataPlane: await healthCheck(config.providerDataPlaneUrl, { service: "Provider Data Plane", warningStatuses: routeReachableStatuses }),
          providerIdentityHub: await healthCheck(config.providerIdentityHubUrl, {
            service: "Provider IdentityHub",
            path: "",
            dedicatedHealthEndpoint: false,
            warningStatuses: routeReachableStatuses,
          }),
          providerVault: await healthCheck(config.providerVaultUrl, {
            service: "Provider Vault",
            path: "",
            warningStatuses: routeReachableStatuses,
          }),
          issuer: await healthCheck(config.issuerHealthUrl, {
            service: "Issuer",
            path: "/api/check/readiness",
            dedicatedHealthEndpoint: true,
            warningStatuses: routeReachableStatuses,
          }),
          traefik: await healthCheck(config.traefikUrl, {
            service: "Traefik",
            path: "",
            dedicatedHealthEndpoint: false,
            warningStatuses: routeReachableStatuses,
          }),
        });
      case "requestCatalog":
        return Response.json(await requestCatalog(config, body.traceId, body.useCaseId));
      case "startContractNegotiation":
        return Response.json(
          await startContractNegotiation(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            offerId: required(body.offerId, "offerId"),
            assetId: body.assetId,
          }),
        );
      case "getContractNegotiation":
        return Response.json(
          await getContractNegotiation(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            negotiationId: required(body.negotiationId, "negotiationId"),
          }),
        );
      case "startTransfer":
        return Response.json(
          await startTransfer(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            agreementId: required(body.agreementId, "agreementId"),
            assetId: body.assetId,
          }),
        );
      case "getTransfer":
        return Response.json(
          await getTransfer(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            transferProcessId: required(body.transferProcessId, "transferProcessId"),
          }),
        );
      case "getEdrOrDataflow":
        return Response.json(
          await getEdrOrDataflow(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            transferProcessId: body.transferProcessId,
          }),
        );
      case "getEdrDataAddress":
        return Response.json(
          await getEdrDataAddress(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            transferProcessId: required(body.transferProcessId, "transferProcessId"),
          }),
        );
      case "fetchData":
        return Response.json(
          await fetchData(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            transferProcessId: required(body.transferProcessId, "transferProcessId"),
            accessToken: body.accessToken,
          }),
        );
      case "terminateTransfer":
        return Response.json(
          await terminateTransfer(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            transferProcessId: required(body.transferProcessId, "transferProcessId"),
            reason: body.reason,
          }),
        );
      case "verifyAccessRevoked":
        return Response.json(
          await verifyAccessRevoked(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            transferProcessId: required(body.transferProcessId, "transferProcessId"),
          }),
        );
      case "queryConsumerCredentials":
        return Response.json(
          await queryConsumerCredentials(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
          }),
        );
      case "revokeConsumerCredential":
        return Response.json(
          await revokeConsumerCredential(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            credentialResourceId: required(body.credentialResourceId, "credentialResourceId"),
          }),
        );
      case "verifyCredentialRevoked":
        return Response.json(
          await verifyCredentialRevoked(config, {
            traceId: body.traceId,
            useCaseId: body.useCaseId,
            credentialResourceId: required(body.credentialResourceId, "credentialResourceId"),
          }),
        );
      default:
        return Response.json({ error: `Unsupported action ${body.action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

function required(value: unknown, name: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}
