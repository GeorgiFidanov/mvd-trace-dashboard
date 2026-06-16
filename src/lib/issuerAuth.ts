import { joinUrl } from "./mvdFlow";
import type { MvdConfig } from "./types";

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function issuerAdminHeaders(config: MvdConfig): Promise<Record<string, string>> {
  if (config.mockMode === "on") {
    return { "Content-Type": "application/json", Accept: "application/json" };
  }
  const token = await getIssuerAdminToken(config);
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function getIssuerAdminToken(config: MvdConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5_000) {
    return cachedToken.value;
  }

  const tokenUrl = joinUrl(
    config.keycloakUrl,
    `/realms/${encodeURIComponent(config.keycloakRealm)}/protocol/openid-connect/token`,
  );
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.issuerOAuthClientId,
    client_secret: config.issuerOAuthClientSecret,
    scope: "issuer-admin-api:write",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      `Failed to obtain IssuerService admin token from Keycloak (${response.status}). Check MVD_KEYCLOAK_URL and issuer OAuth client settings.`,
    );
  }

  const ttlMs = (payload.expires_in ?? 300) * 1000;
  cachedToken = { value: payload.access_token, expiresAt: now + ttlMs };
  return payload.access_token;
}
