import { healthCheck } from "@/lib/mvdClient";
import { checkDatabase, getConfig } from "@/lib/storage";
import type { HealthCheckResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const routeReachableStatuses = [404];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const strict = url.searchParams.get("strict") === "1";
  const config = getConfig();
  const [
    consumerControlPlane,
    consumerDataPlane,
    consumerIdentityHub,
    providerControlPlane,
    providerDataPlane,
    providerIdentityHub,
    providerVault,
    issuer,
    traefik,
  ] = await Promise.all([
    healthCheck(config.consumerControlPlaneUrl, { service: "Consumer Control Plane", warningStatuses: routeReachableStatuses }),
    healthCheck(config.consumerDataPlaneUrl, { service: "Consumer Data Plane", warningStatuses: routeReachableStatuses }),
    healthCheck(config.consumerIdentityHubUrl, {
      service: "Consumer IdentityHub",
      path: "",
      dedicatedHealthEndpoint: false,
      warningStatuses: routeReachableStatuses,
    }),
    healthCheck(config.providerControlPlaneUrl, { service: "Provider Control Plane", warningStatuses: routeReachableStatuses }),
    healthCheck(config.providerDataPlaneUrl, { service: "Provider Data Plane", warningStatuses: routeReachableStatuses }),
    healthCheck(config.providerIdentityHubUrl, {
      service: "Provider IdentityHub",
      path: "",
      dedicatedHealthEndpoint: false,
      warningStatuses: routeReachableStatuses,
    }),
    healthCheck(config.providerVaultUrl, { service: "Provider Vault", path: "", warningStatuses: routeReachableStatuses }),
    healthCheck(config.issuerUrl, { service: "Issuer", path: "", dedicatedHealthEndpoint: false, warningStatuses: routeReachableStatuses }),
    healthCheck(config.traefikUrl, {
      service: "Traefik",
      path: "",
      dedicatedHealthEndpoint: false,
      warningStatuses: routeReachableStatuses,
    }),
  ]);

  let database: HealthCheckResult = {
    ok: true,
    state: "success" as const,
    status: 200 as number | null,
    durationMs: 0,
    url: "sqlite:data/mvd-traces.sqlite",
    checkedUrl: "sqlite:data/mvd-traces.sqlite",
    service: "Dashboard Database",
    explanation: "Success: service is reachable.",
    detail: "SQLite trace storage accepted a test query.",
    dedicatedHealthEndpoint: true,
  };
  try {
    const started = Date.now();
    checkDatabase();
    database = { ...database, durationMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    database = {
      ...database,
      ok: false,
      state: "offline",
      status: null,
      durationMs: 0,
      explanation: "Offline: connection failed, timed out, or DNS failed.",
      detail: message,
    };
  }

  const checks = {
    consumerControlPlane,
    consumerDataPlane,
    consumerIdentityHub,
    providerControlPlane,
    providerDataPlane,
    providerIdentityHub,
    providerVault,
    issuer,
    traefik,
    database,
  };
  const ready = Object.values(checks).every((check) => check.ok);

  return Response.json(
    {
      ready,
      environment: config.environment,
      clusterName: config.clusterName,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: strict && !ready ? 503 : 200 },
  );
}
