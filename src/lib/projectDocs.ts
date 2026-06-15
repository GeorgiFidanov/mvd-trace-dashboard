import { existsSync } from "node:fs";
import path from "node:path";

/** PDF registry — keep in sync with src/app/api/docs/[file]/route.ts */
export const PDF_REGISTRY = new Map([
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

export const MARKDOWN_GUIDES = new Map([
  ["how-this-codebase-runs.md", "How this codebase runs"],
  ["validation-platform-redesign.md", "Validation platform redesign"],
]);

const docsRoot = () => path.join(process.cwd(), "docs");

export function pdfFileExists(filename: string) {
  const relative = PDF_REGISTRY.get(filename);
  if (!relative) return false;
  return existsSync(path.join(docsRoot(), relative));
}

export function markdownGuideExists(filename: string) {
  if (!MARKDOWN_GUIDES.has(filename)) return false;
  return existsSync(path.join(docsRoot(), "guides", filename));
}

export function pdfHref(filename: string) {
  return pdfFileExists(filename) ? `/api/docs/${encodeURIComponent(filename)}` : null;
}

export function markdownHref(filename: string) {
  return markdownGuideExists(filename) ? `/docs/${encodeURIComponent(filename)}` : null;
}
