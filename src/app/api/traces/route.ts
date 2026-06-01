import { createTrace, getTraceWithEvents, listTraces } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const trace = getTraceWithEvents(id);
    return trace ? Response.json({ trace }) : Response.json({ error: "Trace not found" }, { status: 404 });
  }
  return Response.json({ traces: listTraces(50) });
}

export async function POST() {
  return Response.json({ trace: createTrace() });
}
