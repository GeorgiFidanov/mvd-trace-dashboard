import { AppShell } from "@/components/AppShell";
import Link from "next/link";

const components = [
  ["Dashboard", "Guided UI for scenario execution and education."],
  ["Dashboard API", "Next.js server-side API layer that calls EDC services and records traces."],
  ["Consumer Control Plane", "Discovers catalogs, negotiates contracts, and starts transfers."],
  ["Consumer Data Plane", "Retrieves EDR/dataflow metadata and accesses protected data."],
  ["Provider Control Plane", "Publishes assets, policies, contract offers, and DSP endpoints."],
  ["Provider Data Plane", "Hosts or proxies the provider data made available through agreements."],
  ["IdentityHub", "Participant identity, DID, DCP, and credential interaction point."],
  ["Vault", "Stores connector secrets such as STS client secrets and API credentials."],
  ["PostgreSQL", "Persistence for EDC runtime state in Kubernetes deployments."],
  ["Traefik", "Ingress and local routing layer for participant services."],
];

const docs = [
  ["What is a Dataspace FIWARE & EDC.pdf", "Business-friendly dataspace primer for FIWARE and EDC."],
  ["Reading_Guide_Dataspaces_Project.pdf", "Suggested order for reading the project evidence."],
  ["Dataspace Use-Case Validation Platform.pdf", "Presentation document for the validation dashboard itself."],
  ["DataSpace_FIWARE_to_EDC_final.pptx.pdf", "Slide deck covering the FIWARE to EDC MVD direction."],
  ["Technical Documentation Fiware.pdf", "Technical FIWARE notes and reference material."],
  ["fiware-dataspace.pdf", "FIWARE dataspace background material."],
  ["Minimum Viable Dataspace (MVD) Technical Analysis.pdf", "Technical analysis of the Eclipse MVD setup."],
  ["Deployment and Testing Report_ Eclipse MVD.pdf", "Deployment and testing notes for the running environment."],
  ["Eclipse Dataspace Selection & Gaia-X Alignment.pdf", "Why EDC was selected and how it relates to Gaia-X."],
  ["Dataspace_Project_Plan.docx.pdf", "Project plan exported as PDF."],
  ["Dataspace_Whats_Next.docx.pdf", "Next-step planning notes exported as PDF."],
  ["Project_Debriefing_Dataspace_Implementation.docx.pdf", "Project debriefing and implementation reflection."],
  ["Update the use cases then to what they should be b....pdf.pdf", "Use-case update notes."],
  ["Group Retrospectives.pdf", "Project group reflection material."],
];

const markdownGuides = [
  ["how-this-codebase-runs.md", "How this codebase runs", "Beginner-friendly guide to the TypeScript and Next.js dashboard internals."],
  ["validation-platform-redesign.md", "Validation platform redesign", "Architecture and redesign plan for the validation platform."],
];

export default function ArchitecturePage() {
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-200">Project Documentation</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Read the supporting documents inside the dashboard</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                These documents are part of the Pink Panther project evidence. Open them here when you need the why,
                architecture context, deployment notes, or group reflection behind the dashboard.
              </p>
            </div>
          </div>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Markdown guides</h3>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {markdownGuides.map(([file, title, description]) => (
              <Link
                key={file}
                href={`/docs/${encodeURIComponent(file)}`}
                className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Markdown</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </Link>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-pink-200">PDF evidence</h3>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {docs.map(([file, description]) => (
              <Link
                key={file}
                href={`/api/docs/${encodeURIComponent(file)}`}
                target="_blank"
                className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-1 hover:border-pink-300/40 hover:bg-white/10"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-200">PDF</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{file.replace(".pdf", "")}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {components.map(([name, description]) => (
            <article key={name} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <h2 className="text-lg font-semibold text-white">{name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
