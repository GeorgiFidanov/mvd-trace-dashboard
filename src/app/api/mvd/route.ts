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
} from "@/lib/mvdClient";
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
          issuer: await healthCheck(config.issuerUrl, {
            service: "Issuer",
            path: "",
            dedicatedHealthEndpoint: false,
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
