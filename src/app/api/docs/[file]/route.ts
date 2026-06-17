import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { docContentType, getProjectDoc } from "@/lib/projectDocs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const decoded = decodeURIComponent(file);
  const doc = getProjectDoc(decoded);

  if (!doc || doc.kind === "markdown") {
    return new Response("Document not found", { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), "docs", doc.relativePath);
  const [body, fileStat] = await Promise.all([
    readFile(absolutePath).catch(() => null),
    stat(absolutePath).catch(() => null),
  ]);

  if (!body || !fileStat) {
    return new Response("Document file is missing", { status: 404 });
  }

  const safeName = decoded.replaceAll('"', "");
  return new Response(body, {
    headers: {
      "Content-Type": docContentType(doc.kind),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Last-Modified": fileStat.mtime.toUTCString(),
    },
  });
}
