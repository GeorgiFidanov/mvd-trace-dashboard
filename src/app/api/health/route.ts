import { getConfig } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = getConfig();
  return Response.json({
    status: "running",
    service: "dataspace-use-case-validation-platform",
    environment: config.environment,
    clusterName: config.clusterName,
    timestamp: new Date().toISOString(),
  });
}
