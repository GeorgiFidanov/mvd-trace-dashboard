import { AppShell } from "@/components/AppShell";
import { markdownHref, pdfHref } from "@/lib/projectDocs";
import Link from "next/link";

type ArchitectureComponent = {
  name: string;
  description: string;
  linkLabel: string;
  group: string;
  route?: string;
  pdf?: string;
};

const components: ArchitectureComponent[] = [
  {
    name: "Dashboard",
    description: "Guided UI for scenario execution and education.",
    route: "/scenario-wizard",
    linkLabel: "Open Core Demo Playground",
    group: "Presentation layer",
  },
  {
    name: "Dashboard API",
    description: "Next.js server-side API layer that calls EDC services and records traces.",
    route: "/docs/how-this-codebase-runs.md",
    linkLabel: "Read how this codebase runs",
    group: "Presentation layer",
  },
  {
    name: "Consumer Control Plane",
    description: "Discovers catalogs, negotiates contracts, and starts transfers.",
    route: "/scenario-wizard?useCase=UC-CORE&step=core-request-access",
    linkLabel: "Try catalog & access request in Core Demo",
    group: "Consumer participant",
  },
  {
    name: "Consumer Data Plane",
    description: "Retrieves EDR/dataflow metadata and accesses protected data.",
    route: "/deployment-status",
    linkLabel: "Check consumer data plane health",
    group: "Consumer participant",
  },
  {
    name: "Provider Control Plane",
    description: "Publishes assets, policies, contract offers, and DSP endpoints.",
    pdf: "Minimum Viable Dataspace (MVD) Technical Analysis.pdf",
    linkLabel: "MVD technical analysis (PDF)",
    group: "Provider participant",
  },
  {
    name: "Provider Data Plane",
    description: "Hosts or proxies the provider data made available through agreements.",
    route: "/deployment-status",
    linkLabel: "Check provider data plane health",
    group: "Provider participant",
  },
  {
    name: "IdentityHub",
    description: "Participant identity, DID, DCP, and credential interaction point.",
    route: "/scenario-wizard?useCase=UC-CORE&step=core-onboard",
    linkLabel: "Run onboarding step in Core Demo",
    group: "Trust & identity",
  },
  {
    name: "Vault",
    description: "Stores connector secrets such as STS client secrets and API credentials.",
    route: "/deployment-status",
    linkLabel: "Check Vault reachability",
    group: "Trust & identity",
  },
  {
    name: "PostgreSQL",
    description: "Persistence for EDC runtime state in Kubernetes deployments.",
    pdf: "Deployment and Testing Report_ Eclipse MVD.pdf",
    linkLabel: "Deployment & testing report (PDF)",
    group: "Infrastructure",
  },
  {
    name: "Traefik",
    description: "Ingress and local routing layer for participant services.",
    route: "/settings",
    linkLabel: "Configure routing URLs",
    group: "Infrastructure",
  },
];

const componentGroups = ["Presentation layer", "Consumer participant", "Provider participant", "Trust & identity", "Infrastructure"];

type DocEntry = { file: string; title: string; description: string };
type DocSection = { title: string; subtitle: string; docs: DocEntry[]; kind: "markdown" | "pdf" };

const documentationSections: DocSection[] = [
  {
    title: "Getting started",
    subtitle: "What a dataspace is and how to read the project evidence",
    kind: "pdf",
    docs: [
      {
        file: "What is a Dataspace FIWARE & EDC.pdf",
        title: "What is a Dataspace (FIWARE & EDC)",
        description: "Business-friendly dataspace primer for FIWARE and EDC.",
      },
      {
        file: "Reading_Guide_Dataspaces_Project.pdf",
        title: "Reading guide",
        description: "Suggested order for reading the project evidence.",
      },
    ],
  },
  {
    title: "Architecture & platform choice",
    subtitle: "Why EDC MVD, Gaia-X alignment, and how the dashboard fits in",
    kind: "pdf",
    docs: [
      {
        file: "Eclipse Dataspace Selection & Gaia-X Alignment.pdf",
        title: "EDC selection & Gaia-X alignment",
        description: "Why EDC was selected and how it relates to Gaia-X.",
      },
      {
        file: "Dataspace Use-Case Validation Platform.pdf",
        title: "Validation platform presentation",
        description: "Presentation document for the validation dashboard itself.",
      },
    ],
  },
  {
    title: "FIWARE track",
    subtitle: "FIWARE dataspace background and migration context",
    kind: "pdf",
    docs: [
      {
        file: "Technical Documentation Fiware.pdf",
        title: "FIWARE technical documentation",
        description: "Technical FIWARE notes and reference material.",
      },
      {
        file: "fiware-dataspace.pdf",
        title: "FIWARE dataspace overview",
        description: "FIWARE dataspace background material.",
      },
      {
        file: "DataSpace_FIWARE_to_EDC_final.pptx.pdf",
        title: "FIWARE to EDC direction",
        description: "Slide deck covering the FIWARE to EDC MVD direction.",
      },
    ],
  },
  {
    title: "EDC MVD technical depth",
    subtitle: "Connector behaviour, use cases, and technical analysis",
    kind: "pdf",
    docs: [
      {
        file: "Minimum Viable Dataspace (MVD) Technical Analysis.pdf",
        title: "MVD technical analysis",
        description: "Technical analysis of the Eclipse MVD setup.",
      },
      {
        file: "Update the use cases then to what they should be b....pdf.pdf",
        title: "Use-case update notes",
        description: "Notes on aligning use cases with MVD capabilities.",
      },
    ],
  },
  {
    title: "Deployment & testing",
    subtitle: "Running the stack in Kubernetes and validating it live",
    kind: "pdf",
    docs: [
      {
        file: "Deployment and Testing Report_ Eclipse MVD.pdf",
        title: "Deployment & testing report",
        description: "Deployment and testing notes for the running environment.",
      },
    ],
  },
  {
    title: "Project planning & reflection",
    subtitle: "Planning documents, next steps, and team retrospectives",
    kind: "pdf",
    docs: [
      {
        file: "Dataspace_Project_Plan.docx.pdf",
        title: "Project plan",
        description: "Project plan exported as PDF.",
      },
      {
        file: "Dataspace_Whats_Next.docx.pdf",
        title: "What's next",
        description: "Next-step planning notes exported as PDF.",
      },
      {
        file: "Project_Debriefing_Dataspace_Implementation.docx.pdf",
        title: "Project debriefing",
        description: "Project debriefing and implementation reflection.",
      },
      {
        file: "Group Retrospectives.pdf",
        title: "Group retrospectives",
        description: "Project group reflection material.",
      },
    ],
  },
];

const markdownGuides = [
  {
    file: "how-this-codebase-runs.md",
    title: "How this codebase runs",
    description: "Beginner-friendly guide to the TypeScript and Next.js dashboard internals.",
  },
  {
    file: "validation-platform-redesign.md",
    title: "Validation platform redesign",
    description: "Architecture and redesign plan for the validation platform.",
  },
];

function resolveComponentHref(component: ArchitectureComponent) {
  if (component.route?.startsWith("/docs/")) {
    const file = decodeURIComponent(component.route.replace("/docs/", ""));
    return markdownHref(file);
  }
  if (component.route) return component.route;
  if (component.pdf) return pdfHref(component.pdf);
  return null;
}

function resolveDocHref(file: string, kind: "markdown" | "pdf") {
  return kind === "markdown" ? markdownHref(file) : pdfHref(file);
}

function ComponentCard({ component, href }: { component: ArchitectureComponent; href: string }) {
  const external = href.startsWith("/api/docs/");
  const className =
    "group rounded-3xl border border-white/10 bg-slate-900/80 p-5 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.06]";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <CardBody component={component} />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <CardBody component={component} />
    </Link>
  );
}

function CardBody({ component }: { component: ArchitectureComponent }) {
  return (
    <>
      <h3 className="text-lg font-semibold text-white">{component.name}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{component.description}</p>
      <p className="mt-4 text-sm font-semibold text-cyan-200 group-hover:text-cyan-100">{component.linkLabel} →</p>
    </>
  );
}

export default function ArchitecturePage() {
  const availableMarkdown = markdownGuides
    .map((guide) => ({ ...guide, href: markdownHref(guide.file) }))
    .filter((guide): guide is typeof guide & { href: string } => Boolean(guide.href));

  const availableSections = documentationSections
    .map((section) => ({
      ...section,
      docs: section.docs
        .map((doc) => ({ ...doc, href: resolveDocHref(doc.file, section.kind) }))
        .filter((doc): doc is typeof doc & { href: string } => Boolean(doc.href)),
    }))
    .filter((section) => section.docs.length > 0);

  const availableComponents = components
    .map((component) => ({ component, href: resolveComponentHref(component) }))
    .filter((entry): entry is { component: ArchitectureComponent; href: string } => Boolean(entry.href));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Architecture</p>
          <h1 className="mt-2 text-3xl font-bold text-white">How the demonstrator connects to EDC</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            The dashboard stays outside the MVD runtime. It validates scenarios through public participant APIs and stores
            educational traces locally for replay and evaluation.
          </p>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="grid gap-4 text-center text-sm font-semibold text-slate-100">
            <div className="mx-auto rounded-2xl bg-cyan-300 px-5 py-3 text-slate-950">Dashboard</div>
            <div className="text-cyan-200">↓</div>
            <div className="mx-auto rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3">Dashboard API</div>
            <div className="text-cyan-200">↓</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-blue-300/20 bg-blue-300/10 p-5">
                <h2 className="text-lg">Consumer Participant</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl bg-slate-950/60 p-3">Consumer Control Plane</div>
                  <div className="rounded-xl bg-slate-950/60 p-3">Consumer Data Plane</div>
                </div>
              </div>
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                <h2 className="text-lg">Provider Participant</h2>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl bg-slate-950/60 p-3">Provider Control Plane</div>
                  <div className="rounded-xl bg-slate-950/60 p-3">Provider Data Plane</div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {["IdentityHub", "Vault", "PostgreSQL", "Traefik"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-pink-300/20 bg-pink-300/10 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-200">Project Documentation</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Supporting documents grouped by topic</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Only documents that are available in this project are linked. Missing files are hidden rather than sending you to
              a dead end.
            </p>
          </div>

          {availableMarkdown.length > 0 ? (
            <>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Markdown guides</h3>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {availableMarkdown.map((guide) => (
                  <Link
                    key={guide.file}
                    href={guide.href}
                    className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Markdown · Codebase</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{guide.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{guide.description}</p>
                  </Link>
                ))}
              </div>
            </>
          ) : null}

          {availableSections.map((section) => (
            <div key={section.title} className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-200">{section.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{section.subtitle}</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {section.docs.map((doc) => (
                  <a
                    key={doc.file}
                    href={doc.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-1 hover:border-pink-300/40 hover:bg-white/10"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-200">PDF · {section.title}</p>
                    <h4 className="mt-2 text-lg font-semibold text-white">{doc.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{doc.description}</p>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </section>

        {componentGroups.map((group) => {
          const groupComponents = availableComponents.filter((entry) => entry.component.group === group);
          if (!groupComponents.length) return null;
          return (
            <section key={group}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{group}</h2>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {groupComponents.map(({ component, href }) => (
                  <ComponentCard key={component.name} component={component} href={href} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
