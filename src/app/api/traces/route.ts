import { createTrace, deleteTrace, deleteTracesByStatus, getTraceWithEvents, listTracesWithEvents, updateTrace } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const trace = getTraceWithEvents(id);
    return trace ? Response.json({ trace }) : Response.json({ error: "Trace not found" }, { status: 404 });
  }
  return Response.json({ traces: listTracesWithEvents(50) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const status = body.status === "success" || body.status === "error" || body.status === "idle" ? body.status : undefined;
  return Response.json({
    trace: createTrace({
      useCaseId: typeof body.useCaseId === "string" ? body.useCaseId : undefined,
      status,
    }),
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  if (typeof body.id !== "string") return Response.json({ error: "id is required" }, { status: 400 });
  if (body.status !== "running" && body.status !== "success" && body.status !== "error" && body.status !== "idle") {
    return Response.json({ error: "valid status is required" }, { status: 400 });
  }
  return Response.json({ trace: updateTrace(body.id, { status: body.status }) });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  if (id) return Response.json({ deleted: deleteTrace(id) });
  if (status === "running") return Response.json({ deleted: deleteTracesByStatus("running") });
  return Response.json({ error: "Provide id or status=running" }, { status: 400 });
}
