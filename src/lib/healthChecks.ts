import type { HealthCheckResult } from "./types";

/** Not required for catalog/negotiation/transfer; UC-E2 records a warning when these are offline. */
export const OPTIONAL_HEALTH_SERVICES = new Set(["issuer", "traefik"]);

export function offlineHealthServices(checks: Record<string, HealthCheckResult>) {
  return Object.entries(checks)
    .filter(([, check]) => check.state === "offline")
    .map(([key]) => key);
}

export function blockingOfflineHealthServices(checks: Record<string, HealthCheckResult>) {
  return offlineHealthServices(checks).filter((key) => !OPTIONAL_HEALTH_SERVICES.has(key));
}

export function optionalOfflineHealthServices(checks: Record<string, HealthCheckResult>) {
  return offlineHealthServices(checks).filter((key) => OPTIONAL_HEALTH_SERVICES.has(key));
}

export function formatHealthServiceLabel(key: string) {
  const labels: Record<string, string> = {
    consumerControlPlane: "Consumer Control Plane",
    consumerDataPlane: "Consumer Data Plane",
    consumerIdentityHub: "Consumer IdentityHub",
    providerControlPlane: "Provider Control Plane",
    providerDataPlane: "Provider Data Plane",
    providerIdentityHub: "Provider IdentityHub",
    providerVault: "Provider Vault",
    issuer: "Issuer",
    traefik: "Traefik",
  };
  return labels[key] ?? key;
}
