import { existsSync, statSync } from "node:fs";
import path from "node:path";

export type DocKind = "pdf" | "markdown" | "image" | "video";

export type ProjectDoc = {
  /** Registry key — must match the filename used in URLs. */
  file: string;
  title: string;
  description: string;
  relativePath: string;
  kind: DocKind;
};

export type DocSection = {
  title: string;
  subtitle: string;
  docs: ProjectDoc[];
};

/** Single source of truth for docs served from /api/docs and /docs. */
export const PROJECT_DOCS: ProjectDoc[] = [
  // Getting started
  {
    file: "What is a Dataspace FIWARE & EDC.pdf",
    title: "What is a Dataspace (FIWARE & EDC)",
    description: "Business-friendly dataspace primer for FIWARE and EDC.",
    relativePath: "pdfs/What is a Dataspace FIWARE & EDC.pdf",
    kind: "pdf",
  },
  {
    file: "Reading Guide – Dataspaces Project - Final.pdf",
    title: "Reading guide (final)",
    description: "Suggested order for reading the project evidence.",
    relativePath: "pdfs/Reading Guide – Dataspaces Project - Final.pdf",
    kind: "pdf",
  },
  {
    file: "Starter Kit for Data Space Designers Version 1.5.pdf",
    title: "Starter Kit for Data Space Designers",
    description: "DSSC starter kit reference for dataspace design vocabulary.",
    relativePath: "pdfs/Starter Kit for Data Space Designers Version 1.5.pdf",
    kind: "pdf",
  },

  // Architecture & platform choice
  {
    file: "Eclipse Dataspace Selection & Gaia-X Alignment - Final.pdf",
    title: "EDC selection & Gaia-X alignment (final)",
    description: "Why EDC was selected and how it relates to Gaia-X.",
    relativePath: "pdfs/Eclipse Dataspace Selection & Gaia-X Alignment - Final.pdf",
    kind: "pdf",
  },
  {
    file: "Dataspace_Use_Case_Validation_Platform_Final.pdf",
    title: "Validation platform (final)",
    description: "Presentation document for the Pink Panther validation dashboard.",
    relativePath: "pdfs/Dataspace_Use_Case_Validation_Platform_Final.pdf",
    kind: "pdf",
  },
  {
    file: "how-this-codebase-runs.md",
    title: "How this codebase runs",
    description: "Beginner-friendly guide to the TypeScript and Next.js dashboard internals.",
    relativePath: "guides/how-this-codebase-runs.md",
    kind: "markdown",
  },
  {
    file: "validation-platform-redesign.md",
    title: "Validation platform redesign",
    description: "Architecture and redesign plan for the validation platform.",
    relativePath: "guides/validation-platform-redesign.md",
    kind: "markdown",
  },

  // FIWARE track
  {
    file: "Technical Documentation Fiware.pdf",
    title: "FIWARE technical documentation",
    description: "Technical FIWARE notes and reference material.",
    relativePath: "pdfs/Technical Documentation Fiware.pdf",
    kind: "pdf",
  },
  {
    file: "fiware-dataspace.pdf",
    title: "FIWARE dataspace overview",
    description: "FIWARE dataspace background material.",
    relativePath: "pdfs/fiware-dataspace.pdf",
    kind: "pdf",
  },
  {
    file: "DataSpace_FIWARE_to_EDC_final.pptx.pdf",
    title: "FIWARE to EDC direction",
    description: "Slide deck covering the FIWARE to EDC MVD direction.",
    relativePath: "pdfs/DataSpace_FIWARE_to_EDC_final.pptx.pdf",
    kind: "pdf",
  },

  // EDC MVD technical depth
  {
    file: "Minimum Viable Dataspace (MVD) Technical Analysis Final.pdf",
    title: "MVD technical analysis (final)",
    description: "Technical analysis of the Eclipse MVD connector stack.",
    relativePath: "pdfs/Minimum Viable Dataspace (MVD) Technical Analysis Final.pdf",
    kind: "pdf",
  },
  {
    file: "Use_Cases_EDC.pdf",
    title: "EDC use cases",
    description: "Use-case definitions aligned with the live MVD validation scenarios.",
    relativePath: "pdfs/Use_Cases_EDC.pdf",
    kind: "pdf",
  },

  // Deployment & testing
  {
    file: "Deployment_and_Testing_Report__Eclipse_MVD_Final.pdf",
    title: "Deployment & testing report (final)",
    description: "Kubernetes deployment and live validation notes for Eclipse MVD.",
    relativePath: "pdfs/Deployment_and_Testing_Report__Eclipse_MVD_Final.pdf",
    kind: "pdf",
  },

  // Project planning & reflection
  {
    file: "Dataspace_Project_Plan_Final.pdf",
    title: "Project plan (final)",
    description: "Final project plan for the dataspace implementation.",
    relativePath: "pdfs/Dataspace_Project_Plan_Final.pdf",
    kind: "pdf",
  },
  {
    file: "Dataspace_Whats_Next.docx.pdf",
    title: "What's next",
    description: "Next-step planning notes exported as PDF.",
    relativePath: "pdfs/Dataspace_Whats_Next.docx.pdf",
    kind: "pdf",
  },
  {
    file: "Project_Debriefing_Dataspace_Implementation.pdf",
    title: "Project debriefing",
    description: "Project debriefing and implementation reflection.",
    relativePath: "pdfs/Project_Debriefing_Dataspace_Implementation.pdf",
    kind: "pdf",
  },
  {
    file: "Group Retrospectives.pdf",
    title: "Group retrospectives",
    description: "Project group reflection material.",
    relativePath: "pdfs/Group Retrospectives.pdf",
    kind: "pdf",
  },

  // Demo & outreach
  {
    file: "Dashboard-Final-Demo.mp4",
    title: "Dashboard final demo",
    description: "Screen recording of the Core Demo validation flow.",
    relativePath: "misc/Dashboard-Final-Demo.mp4",
    kind: "video",
  },
  {
    file: "EDC-MVD-Dashboard-QR-Code.png",
    title: "Dashboard QR code",
    description: "QR code for reaching the deployed validation dashboard.",
    relativePath: "misc/EDC-MVD-Dashboard-QR-Code.png",
    kind: "image",
  },
];

export const DOC_SECTIONS: DocSection[] = [
  {
    title: "Getting started",
    subtitle: "What a dataspace is and how to read the project evidence",
    docs: PROJECT_DOCS.filter((d) =>
      [
        "What is a Dataspace FIWARE & EDC.pdf",
        "Reading Guide – Dataspaces Project - Final.pdf",
        "Starter Kit for Data Space Designers Version 1.5.pdf",
      ].includes(d.file),
    ),
  },
  {
    title: "Architecture & platform choice",
    subtitle: "Why EDC MVD, Gaia-X alignment, and how the dashboard fits in",
    docs: PROJECT_DOCS.filter((d) =>
      [
        "Eclipse Dataspace Selection & Gaia-X Alignment - Final.pdf",
        "Dataspace_Use_Case_Validation_Platform_Final.pdf",
        "how-this-codebase-runs.md",
        "validation-platform-redesign.md",
      ].includes(d.file),
    ),
  },
  {
    title: "FIWARE track",
    subtitle: "FIWARE dataspace background and migration context",
    docs: PROJECT_DOCS.filter((d) =>
      [
        "Technical Documentation Fiware.pdf",
        "fiware-dataspace.pdf",
        "DataSpace_FIWARE_to_EDC_final.pptx.pdf",
      ].includes(d.file),
    ),
  },
  {
    title: "EDC MVD technical depth",
    subtitle: "Connector behaviour, use cases, and process documentation",
    docs: PROJECT_DOCS.filter((d) =>
      [
        "Minimum Viable Dataspace (MVD) Technical Analysis Final.pdf",
        "Use_Cases_EDC.pdf",
        "edc-mvd-bpmn-generation-prompt.md",
      ].includes(d.file),
    ),
  },
  {
    title: "Deployment & testing",
    subtitle: "Running the stack in Kubernetes and validating it live",
    docs: PROJECT_DOCS.filter((d) =>
      ["Deployment_and_Testing_Report__Eclipse_MVD_Final.pdf"].includes(d.file),
    ),
  },
  {
    title: "Project planning & reflection",
    subtitle: "Planning documents, next steps, and team retrospectives",
    docs: PROJECT_DOCS.filter((d) =>
      [
        "Dataspace_Project_Plan_Final.pdf",
        "Dataspace_Whats_Next.docx.pdf",
        "Project_Debriefing_Dataspace_Implementation.pdf",
        "Group Retrospectives.pdf",
      ].includes(d.file),
    ),
  },
  {
    title: "Demo & outreach",
    subtitle: "Recorded walkthrough and deployment QR code",
    docs: PROJECT_DOCS.filter((d) =>
      ["Dashboard-Final-Demo.mp4", "EDC-MVD-Dashboard-QR-Code.png"].includes(d.file),
    ),
  },
];

const docsRoot = () => path.join(process.cwd(), "docs");

const DOC_BY_FILE = new Map(PROJECT_DOCS.map((doc) => [doc.file, doc]));

const CONTENT_TYPES: Record<DocKind, string> = {
  pdf: "application/pdf",
  markdown: "text/markdown; charset=utf-8",
  image: "image/png",
  video: "video/mp4",
};

export function getProjectDoc(file: string) {
  return DOC_BY_FILE.get(file) ?? null;
}

export function docExists(file: string) {
  const doc = getProjectDoc(file);
  if (!doc) return false;
  return existsSync(path.join(docsRoot(), doc.relativePath));
}

export function docContentType(kind: DocKind) {
  return CONTENT_TYPES[kind];
}

export function docRevision(file: string) {
  const doc = getProjectDoc(file);
  if (!doc) return null;
  const fullPath = path.join(docsRoot(), doc.relativePath);
  try {
    const stat = statSync(fullPath);
    return `${Math.floor(stat.mtimeMs)}-${stat.size}`;
  } catch {
    return null;
  }
}

export function docHref(file: string) {
  if (!docExists(file)) return null;
  const doc = getProjectDoc(file);
  if (!doc) return null;
  const revision = docRevision(file);
  const query = revision ? `?v=${encodeURIComponent(revision)}` : "";
  if (doc.kind === "markdown") return `/docs/${encodeURIComponent(file)}${query}`;
  return `/api/docs/${encodeURIComponent(file)}${query}`;
}

/** @deprecated Use docHref — kept for architecture page migration. */
export function pdfHref(filename: string) {
  const doc = getProjectDoc(filename);
  if (!doc || doc.kind !== "pdf") return null;
  return docHref(filename);
}

/** @deprecated Use docHref — kept for architecture page migration. */
export function markdownHref(filename: string) {
  const doc = getProjectDoc(filename);
  if (!doc || doc.kind !== "markdown") return null;
  return docHref(filename);
}

export function availableDocSections() {
  return DOC_SECTIONS.map((section) => ({
    ...section,
    docs: section.docs
      .map((doc) => ({ ...doc, href: docHref(doc.file) }))
      .filter((doc): doc is typeof doc & { href: string } => Boolean(doc.href)),
  })).filter((section) => section.docs.length > 0);
}
