import {
  fetchData,
  getContractNegotiation,
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = { ...getConfig(), ...(body.config ?? {}) };

    switch (body.action) {
      case "health":
        return Response.json({
          consumerControlPlane: await healthCheck(config.consumerControlPlaneUrl),
          providerControlPlane: await healthCheck(config.providerControlPlaneUrl),
          consumerDataPlane: await healthCheck(config.consumerDataPlaneUrl),
        });
      case "requestCatalog":
        return Response.json(await requestCatalog(config, body.traceId));
      case "startContractNegotiation":
        return Response.json(
          await startContractNegotiation(config, {
            traceId: body.traceId,
            offerId: required(body.offerId, "offerId"),
            assetId: body.assetId,
          }),
        );
      case "getContractNegotiation":
        return Response.json(
          await getContractNegotiation(config, {
            traceId: body.traceId,
            negotiationId: required(body.negotiationId, "negotiationId"),
          }),
        );
      case "startTransfer":
        return Response.json(
          await startTransfer(config, {
            traceId: body.traceId,
            agreementId: required(body.agreementId, "agreementId"),
            assetId: body.assetId,
          }),
        );
      case "getTransfer":
        return Response.json(
          await getTransfer(config, {
            traceId: body.traceId,
            transferProcessId: required(body.transferProcessId, "transferProcessId"),
          }),
        );
      case "getEdrOrDataflow":
        return Response.json(
          await getEdrOrDataflow(config, {
            traceId: body.traceId,
            transferProcessId: body.transferProcessId,
          }),
        );
      case "fetchData":
        return Response.json(
          await fetchData(config, {
            traceId: body.traceId,
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
