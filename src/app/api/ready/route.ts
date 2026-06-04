import { healthCheck } from "@/lib/mvdClient";
import { checkDatabase, getConfig } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getConfig();
  const [consumerControlPlane, providerControlPlane, consumerDataPlane] = await Promise.all([
    healthCheck(config.consumerControlPlaneUrl),
    healthCheck(config.providerControlPlaneUrl),
    healthCheck(config.consumerDataPlaneUrl),
  ]);

  let database = { ok: true, status: 200 as number | null, durationMs: 0 };
  try {
    const started = Date.now();
    checkDatabase();
    database = { ok: true, status: 200, durationMs: Date.now() - started };
  } catch {
    database = { ok: false, status: null, durationMs: 0 };
  }

  const checks = {
    consumerControlPlane,
    providerControlPlane,
    consumerDataPlane,
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
    { status: ready ? 200 : 503 },
  );
}
