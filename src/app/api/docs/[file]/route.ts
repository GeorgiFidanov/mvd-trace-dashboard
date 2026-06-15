import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedDocs = new Map([
  ["What is a Dataspace FIWARE & EDC.pdf", "pdfs/What is a Dataspace FIWARE & EDC.pdf"],
  ["Reading_Guide_Dataspaces_Project.pdf", "pdfs/Reading_Guide_Dataspaces_Project.pdf"],
  ["Minimum Viable Dataspace (MVD) Technical Analysis.pdf", "pdfs/Minimum Viable Dataspace (MVD) Technical Analysis.pdf"],
  ["Deployment and Testing Report_ Eclipse MVD.pdf", "pdfs/Deployment and Testing Report_ Eclipse MVD.pdf"],
  ["Eclipse Dataspace Selection & Gaia-X Alignment.pdf", "pdfs/Eclipse Dataspace Selection & Gaia-X Alignment.pdf"],
  ["Group Retrospectives.pdf", "pdfs/Group Retrospectives.pdf"],
  ["DataSpace_FIWARE_to_EDC_final.pptx.pdf", "pdfs/DataSpace_FIWARE_to_EDC_final.pptx.pdf"],
  ["Dataspace Use-Case Validation Platform.pdf", "pdfs/Dataspace Use-Case Validation Platform.pdf"],
  ["Dataspace_Project_Plan.docx.pdf", "pdfs/Dataspace_Project_Plan.docx.pdf"],
  ["Dataspace_Whats_Next.docx.pdf", "pdfs/Dataspace_Whats_Next.docx.pdf"],
  ["Project_Debriefing_Dataspace_Implementation.docx.pdf", "pdfs/Project_Debriefing_Dataspace_Implementation.docx.pdf"],
  ["Technical Documentation Fiware.pdf", "pdfs/Technical Documentation Fiware.pdf"],
  ["Update the use cases then to what they should be b....pdf.pdf", "pdfs/Update the use cases then to what they should be b....pdf.pdf"],
  ["fiware-dataspace.pdf", "pdfs/fiware-dataspace.pdf"],
]);

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const decoded = decodeURIComponent(file);

  const relativePath = allowedDocs.get(decoded);
  if (!relativePath) {
    return new Response("Document not found", { status: 404 });
  }

  const body = await readFile(path.join(process.cwd(), "docs", relativePath)).catch(() => null);
  if (!body) {
    return new Response("Document file is missing", { status: 404 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${decoded.replaceAll('"', "")}"`,
    },
  });
}
