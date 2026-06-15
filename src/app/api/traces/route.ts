import { addTraceEvent, createTrace, deleteTrace, deleteTracesByStatus, getTraceWithEvents, listTracesWithEvents, updateTrace } from "@/lib/storage";

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
  let status = body.status;
  if (status === "success") {
    const trace = getTraceWithEvents(body.id);
    if (trace?.events.some((event) => event.status === "error")) {
      status = "error";
    }
  }
  return Response.json({ trace: updateTrace(body.id, { status }) });
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (typeof body.traceId !== "string") return Response.json({ error: "traceId is required" }, { status: 400 });
  if (typeof body.stepName !== "string") return Response.json({ error: "stepName is required" }, { status: 400 });
  if (body.status !== "success" && body.status !== "error" && body.status !== "pending") {
    return Response.json({ error: "valid event status is required" }, { status: 400 });
  }

  const startedAt = typeof body.startedAt === "string" ? body.startedAt : new Date().toISOString();
  const completedAt = typeof body.completedAt === "string" ? body.completedAt : new Date().toISOString();
  const event = addTraceEvent({
    traceId: body.traceId,
    stepName: body.stepName,
    actor: typeof body.actor === "string" ? body.actor : "Dashboard",
    target: typeof body.target === "string" ? body.target : "Scenario Wizard",
    method: typeof body.method === "string" ? body.method : "WIZARD",
    url: typeof body.url === "string" ? body.url : "/scenario-wizard",
    requestHeadersRedacted: {},
    requestBody: body.requestBody ?? null,
    responseStatus: typeof body.responseStatus === "number" ? body.responseStatus : null,
    responseBody: body.responseBody ?? null,
    extractedIds: {},
    status: body.status,
    errorMessage: typeof body.errorMessage === "string" ? body.errorMessage : null,
    startedAt,
    completedAt,
    durationMs: Date.parse(completedAt) - Date.parse(startedAt),
  });
  return Response.json({ event });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  if (id) return Response.json({ deleted: deleteTrace(id) });
  if (status === "running") return Response.json({ deleted: deleteTracesByStatus("running") });
  return Response.json({ error: "Provide id or status=running" }, { status: 400 });
}
