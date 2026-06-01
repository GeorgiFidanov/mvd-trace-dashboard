import { getConfig, saveConfig } from "@/lib/storage";
import type { MvdConfig } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json({ config: getConfig() });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<MvdConfig>;
  const current = getConfig();
  const config = saveConfig({ ...current, ...body });
  return Response.json({ config });
}
