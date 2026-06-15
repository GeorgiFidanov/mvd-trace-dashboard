"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { roleLabels, useCases, wizardSteps, type WizardStepRole } from "@/lib/useCases";

type ActorLane = "Participant" | "Governance" | "Platform" | "Provider" | "Consumer";

type DsscMapping = {
  buildingBlock: string;
  protocol: string;
  serviceDefinition: string;
  auditCriteria: string;
};

type ProcessStep = {
  id: string;
  stage: number;
  lane: ActorLane;
  title: string;
  description: string;
  whatUserSees: string;
  systemDoes: string;
  responsibleActor: string;
  successCriteria: string;
  miniSteps: string[];
  mapping: DsscMapping;
  technicalDetails: string;
  custom?: boolean;
};

const lanes: ActorLane[] = ["Participant", "Governance", "Platform", "Provider", "Consumer"];
const storageKey = "mvd-custom-process-steps";
const scenarioFilters = [
  { id: "all", label: "All scenarios" },
  { id: "trust", label: "Governance / Trust" },
  { id: "discovery", label: "Catalog / Discovery" },
  { id: "policy", label: "Policy" },
  { id: "exchange", label: "Exchange" },
  { id: "data", label: "Data access" },
] as const;

const defaultSteps: ProcessStep[] = [
  {
    id: "onboard",
    stage: 1,
    lane: "Participant",
    title: "Onboard participant",
    description: "A person or organisation joins the dataspace and receives the trust material needed to interact.",
    whatUserSees: "The participant is registered and shown as ready to take part in trusted data sharing.",
    systemDoes: "IdentityHub creates participant context, DID material, and credential requests. The issuer prepares trust credentials.",
    responsibleActor: "Participant with Governance / Trust",
    successCriteria: "The participant identity resolves and required credentials are issued.",
    miniSteps: ["Create participant identity", "Issue trust credentials", "Confirm participant is reachable"],
    mapping: {
      buildingBlock: "Trust Framework; Identity & Attestation Management",
      protocol: "W3C DID Core; Verifiable Credentials; OAuth 2.0",
      serviceDefinition: "Participant Agent Services; Federation Services",
      auditCriteria: "Every participant must resolve through a standard DID and hold auditable credentials before protected access.",
    },
    technicalDetails: "IdentityHub DID endpoint, issuer credential flow, STS token configuration, vault-backed key aliases.",
  },
  {
    id: "publish",
    stage: 2,
    lane: "Provider",
    title: "Create / publish data offer",
    description: "The provider describes a dataset, attaches policy rules, and makes the offer discoverable.",
    whatUserSees: "A clear data offer appears in the catalog with usage conditions attached.",
    systemDoes: "The provider control plane creates assets, policy definitions, contract definitions, and catalog metadata.",
    responsibleActor: "Provider",
    successCriteria: "A catalog request can find the offer and its policy.",
    miniSteps: ["Describe dataset", "Attach policy rules", "Publish offer"],
    mapping: {
      buildingBlock: "Publication & Discovery; Data & Service Descriptions",
      protocol: "DCAT; JSON-LD; ODRL",
      serviceDefinition: "Marketplace / Catalogue Service; Contract Management Service",
      auditCriteria: "Published offers must bind a dataset identifier to explicit usage rules and discoverable metadata.",
    },
    technicalDetails: "Provider management APIs create assets, policies, contract definitions, and DSP catalog responses.",
  },
  {
    id: "request",
    stage: 3,
    lane: "Consumer",
    title: "Request data access",
    description: "The consumer finds the offer, asks for access, and policy plus trust are checked.",
    whatUserSees: "The consumer chooses an offer and sees whether access is allowed.",
    systemDoes: "The consumer control plane requests the catalog, starts contract negotiation, and polls for agreement state.",
    responsibleActor: "Consumer with Provider approval",
    successCriteria: "A contract agreement is created for the selected offer.",
    miniSteps: ["Find offer", "Request agreement", "Check identity and policy"],
    mapping: {
      buildingBlock: "Access & Usage Policies Enforcement; Data Exchange",
      protocol: "Dataspace Protocol; ODRL",
      serviceDefinition: "Contract Management Service; Policy Decision Service",
      auditCriteria: "Access decisions must reference participant identity, selected asset, and machine-readable policy terms.",
    },
    technicalDetails: "Catalog request, contract negotiation request, negotiation polling, extracted agreement ID.",
  },
  {
    id: "use",
    stage: 4,
    lane: "Platform",
    title: "Access & use data",
    description: "The consumer receives permission and data is exchanged through a controlled technical path.",
    whatUserSees: "The dashboard shows that access was granted and the data result was received.",
    systemDoes: "The transfer process starts, the data plane exposes an endpoint reference, and the proxy fetches data.",
    responsibleActor: "Platform with Consumer and Provider",
    successCriteria: "A transfer starts and the final data payload is returned.",
    miniSteps: ["Start transfer", "Receive token / endpoint reference", "Fetch protected data"],
    mapping: {
      buildingBlock: "Data Exchange; Policy Enforcement",
      protocol: "HTTP Pull; OAuth 2.0 Bearer; Dataspace Protocol",
      serviceDefinition: "Data Exchange Service; Policy Enforcement Service",
      auditCriteria: "Data must move through controlled exchange paths and deny access when tokens or agreements are invalid.",
    },
    technicalDetails: "Transfer process API, EDR / dataflow endpoint, proxy token, final data response.",
  },
  {
    id: "revoke",
    stage: 5,
    lane: "Governance",
    title: "Offboard / revoke access",
    description: "Access or participant trust is removed and the system proves that denied access is enforced.",
    whatUserSees: "The participant or access permission is revoked and a follow-up access attempt is denied.",
    systemDoes: "Trust, credentials, policy, or token validity is removed so later requests fail safely.",
    responsibleActor: "Governance / Trust with Provider control",
    successCriteria: "The system denies access after revocation.",
    miniSteps: ["Revoke trust or permission", "Retry access", "Confirm denial"],
    mapping: {
      buildingBlock: "Trust Framework; Access & Usage Policies Enforcement",
      protocol: "Credential Status; ODRL; OAuth token expiry",
      serviceDefinition: "Credential Verification Service; Policy Enforcement Service",
      auditCriteria: "Revocation must be provable by a denied request and visible in audit evidence.",
    },
    technicalDetails: "Credential status, policy update, token expiry, failed data-plane request, related logs.",
  },
];

export function ProcessVisualizationClient({ compact = false, showProcessMap = true }: { compact?: boolean; showProcessMap?: boolean }) {
  const [customSteps, setCustomSteps] = useState<ProcessStep[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [scenarioFilter, setScenarioFilter] = useState<(typeof scenarioFilters)[number]["id"]>("all");
  const steps = useMemo(() => [...defaultSteps, ...customSteps].sort((a, b) => a.stage - b.stage), [customSteps]);
  const filteredUseCases = useMemo(
    () =>
      useCases.filter((useCase) => {
        if (scenarioFilter === "all") return true;
        return wizardSteps.some((step) => step.role === scenarioFilter && step.useCaseIds.includes(useCase.id));
      }),
    [scenarioFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setCustomSteps(JSON.parse(saved) as ProcessStep[]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function addStep(formData: FormData) {
    const mapping: DsscMapping = {
      buildingBlock: String(formData.get("buildingBlock") || "Custom mapping"),
      protocol: String(formData.get("protocol") || "To be confirmed"),
      serviceDefinition: String(formData.get("serviceDefinition") || "To be confirmed"),
      auditCriteria: String(formData.get("auditCriteria") || "Define audit evidence before production use."),
    };
    const next: ProcessStep = {
      id: crypto.randomUUID(),
      stage: Number(formData.get("stage") || 5),
      lane: String(formData.get("lane") || "Platform") as ActorLane,
      title: String(formData.get("title") || "Custom process step"),
      description: String(formData.get("description") || "Describe what happens in this step."),
      whatUserSees: String(formData.get("whatUserSees") || "Stakeholders see a clear status update."),
      systemDoes: String(formData.get("systemDoes") || "The platform records the required technical evidence."),
      responsibleActor: String(formData.get("responsibleActor") || formData.get("lane") || "Platform"),
      successCriteria: String(formData.get("successCriteria") || "Success criteria to be defined."),
      miniSteps: String(formData.get("miniSteps") || "Review, Execute, Verify")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      mapping,
      technicalDetails: String(formData.get("technicalDetails") || "No technical detail added yet."),
      custom: true,
    };
    const updated = [...customSteps, next];
    setCustomSteps(updated);
    window.localStorage.setItem(storageKey, JSON.stringify(updated));
    setShowForm(false);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Process View</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Trusted data sharing in business language</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Start with a scenario, then inspect the business steps behind it. The page keeps the explanation simple first,
            with technical details available only when you open them.
          </p>
        </div>
      </div>

      {!compact ? (
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-200">Scenarios</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Choose what you want to prove</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Pick a scenario by topic. Run Scenario opens the guided wizard with the right steps already selected.
                View Results opens previous runs for that same scenario.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {scenarioFilters.map((filter) => {
              const active = scenarioFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setScenarioFilter(filter.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-pink-300 bg-pink-300 text-slate-950"
                      : "border-white/10 bg-slate-950/70 text-slate-200 hover:border-pink-300/40 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {filteredUseCases.map((useCase) => {
              const relatedSteps = wizardSteps.filter((step) => step.useCaseIds.includes(useCase.id));
              const roles = Array.from(new Set(relatedSteps.map((step) => step.role)));
              return (
                <article
                  key={useCase.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${useCase.shortTitle} scenario`}
                  onClick={() => {
                    window.location.href = useCase.primaryRoute;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") window.location.href = useCase.primaryRoute;
                  }}
                  className="cursor-pointer rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">{useCase.id}</p>
                      <h4 className="mt-2 text-xl font-bold text-white">{useCase.shortTitle}</h4>
                    </div>
                    <span className={scenarioStatusClass(useCase.status)}>{useCase.status === "ready" ? "Available now" : useCase.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{useCase.goal}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{useCase.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <span key={role} className="rounded-full bg-white/[0.06] px-2 py-1 text-xs font-semibold text-slate-300">
                        {roleLabels[role]}
                      </span>
                    ))}
                  </div>
                  <details className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80" onClick={(event) => event.stopPropagation()}>
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                      <span>Steps in this scenario</span>
                      <span className="text-slate-500">{relatedSteps.length} steps</span>
                    </summary>
                    <div className="grid gap-2 px-4 pb-4">
                      {relatedSteps.map((step) => (
                        <div key={step.id} className="grid grid-cols-[auto_1fr] items-center gap-2 text-xs text-slate-300">
                          <span className={roleDot(step.role)} />
                          <span>{step.title}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                  <details className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80" onClick={(event) => event.stopPropagation()}>
                    <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-pink-100">
                      What success looks like
                    </summary>
                    <p className="px-4 pb-4 text-sm leading-6 text-slate-200">{useCase.successCriteria}</p>
                  </details>
                  <details className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80" onClick={(event) => event.stopPropagation()}>
                    <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                      Business process summary
                    </summary>
                    <div className="grid gap-3 px-4 pb-4">
                      {scenarioProcessSteps(useCase.id).map((step) => (
                        <div key={step.id} className="rounded-xl bg-slate-950/50 p-3">
                          <p className="text-sm font-semibold text-white">{step.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">{step.description}</p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">What the user sees</p>
                          <p className="mt-1 text-sm leading-6 text-slate-200">{step.whatUserSees}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                  <details className="mt-3 rounded-2xl border border-white/10 bg-[#11141c]" onClick={(event) => event.stopPropagation()}>
                    <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      DSSC mapping & audit panel
                    </summary>
                    <div className="grid gap-3 px-4 pb-4 text-sm text-slate-300">
                      <InfoBlock label="Building Block" value={scenarioDssc(useCase.id).buildingBlock} dark />
                      <InfoBlock label="Audit Evidence" value="Each run stores trace events with request outcome, extracted IDs, and final scenario status." dark />
                    </div>
                  </details>
                  <details className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80" onClick={(event) => event.stopPropagation()}>
                    <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Show technical details
                    </summary>
                    <p className="px-4 pb-4 text-sm leading-6 text-slate-300">{scenarioDssc(useCase.id).technicalDetails}</p>
                  </details>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={useCase.primaryRoute}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-xl bg-pink-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-pink-200"
                    >
                      Run Scenario
                    </Link>
                    <Link
                      href={`/execution-history?useCase=${useCase.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                    >
                      View Results
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!compact ? (
        <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Custom Process Builder</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Add a step to the process map</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Use this when your team wants to explain an extra business action, approval moment, or audit checkpoint.
                Custom cards are stored locally in this browser.
              </p>
            </div>
            <button
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
              onClick={() => setShowForm((current) => !current)}
            >
              {showForm ? "Close builder" : "Add to process"}
            </button>
          </div>
          {showForm ? <div className="mt-5"><AddProcessStepForm onSubmit={addStep} /></div> : null}
        </section>
      ) : null}

      {showProcessMap ? (
        <>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Steps</p>
            <h3 className="mt-2 text-2xl font-bold text-white">What happens inside a dataspace exchange</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              These cards describe the business process. Open the dropdowns when you need the detailed actions, audit mapping,
              or technical notes.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-4">
            <div className="mb-4 grid gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-5">
              {lanes.map((lane) => (
                <div key={lane} className="rounded-xl border border-white/10 bg-slate-950/70 px-2 py-3">
                  {lane}
                </div>
              ))}
            </div>
            <div className={compact ? "grid gap-4 lg:grid-cols-2" : "grid gap-5 lg:grid-cols-2 2xl:grid-cols-3"}>
              {steps.map((step) => (
                <ProcessStepCard key={step.id} step={step} />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function roleDot(role: WizardStepRole) {
  const colors: Record<WizardStepRole, string> = {
    trust: "bg-amber-300",
    discovery: "bg-cyan-300",
    policy: "bg-pink-300",
    exchange: "bg-orange-300",
    data: "bg-emerald-300",
  };
  return `h-2.5 w-2.5 rounded-full ${colors[role]}`;
}

function scenarioStatusClass(status: string) {
  const classes: Record<string, string> = {
    ready: "bg-emerald-400/15 text-emerald-100",
    running: "bg-cyan-400/15 text-cyan-100",
    success: "bg-emerald-400/15 text-emerald-100",
    warning: "bg-amber-400/15 text-amber-100",
    failed: "bg-red-400/15 text-red-100",
  };
  return `rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes[status] ?? "bg-slate-400/15 text-slate-100"}`;
}

function scenarioDssc(useCaseId: string) {
  const mapping: Record<string, { buildingBlock: string; technicalDetails: string }> = {
    "UC-E1": {
      buildingBlock: "Publication & Discovery; Contract Management; Data Exchange",
      technicalDetails: "Catalog request, contract negotiation, transfer start, EDR/dataflow lookup, and protected data fetch.",
    },
    "UC-E2": {
      buildingBlock: "Trust Framework; Identity & Attestation Management",
      technicalDetails: "Service reachability, IdentityHub checks, DID / credential readiness, and participant trust prerequisites.",
    },
    "UC-E3": {
      buildingBlock: "Access & Usage Policies Enforcement; Contract Management",
      technicalDetails: "ODRL policy terms, selected contract offer, negotiation state, and agreement validation.",
    },
    "UC-E4": {
      buildingBlock: "Publication & Discovery; Data & Service Descriptions",
      technicalDetails: "Federated catalog request, provider asset metadata, offer extraction, and catalog response evidence.",
    },
    "UC-E5": {
      buildingBlock: "Trust Framework; Publication & Discovery; Contract Management; Data Exchange",
      technicalDetails: "End-to-end evidence across health, catalog, offer selection, negotiation, policy, transfer, and data retrieval.",
    },
    "UC-E6": {
      buildingBlock: "Observability; Audit Evidence; Interoperability Assessment",
      technicalDetails: "Trace review, endpoint assumptions, failed calls, protocol limitations, and findings documentation.",
    },
  };
  return mapping[useCaseId] ?? mapping["UC-E5"];
}

function scenarioProcessSteps(useCaseId: string) {
  const all = defaultSteps;
  const byUseCase: Record<string, string[]> = {
    "UC-E1": ["publish", "request", "use"],
    "UC-E2": ["onboard"],
    "UC-E3": ["publish", "request"],
    "UC-E4": ["publish"],
    "UC-E5": ["onboard", "publish", "request", "use"],
    "UC-E6": ["request", "revoke"],
  };
  const ids = byUseCase[useCaseId] ?? byUseCase["UC-E5"];
  return all.filter((step) => ids.includes(step.id));
}

function ProcessStepCard({ step }: { step: ProcessStep }) {
  return (
    <article
      className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-slate-950/20"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-cyan-200">
          {step.stage}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {step.lane}
            </span>
            <ActorChip actor={step.responsibleActor} />
            {step.custom ? <span className="rounded-full bg-purple-400/15 px-2 py-1 text-xs font-semibold text-purple-100">Custom</span> : null}
          </div>
          <h3 className="mt-3 text-xl font-bold text-white">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <InfoBlock label="What the user sees" value={step.whatUserSees} />
        <InfoBlock label="What the system does" value={step.systemDoes} />
        <InfoBlock label="Success criteria" value={step.successCriteria} />
      </div>

      <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-cyan-100">
          Mini executable steps
        </summary>
        <div className="grid gap-2 px-4 pb-4">
          {step.miniSteps.map((miniStep, index) => (
            <div key={miniStep} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-white/[0.04] p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15 text-xs font-black text-cyan-100">
                {step.stage}
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-sm text-slate-200">{miniStep}</span>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">Ready</span>
            </div>
          ))}
        </div>
      </details>

      <details className="mt-3 rounded-2xl border border-white/10 bg-[#11141c]">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
          DSSC mapping & audit panel
        </summary>
        <div className="grid gap-3 px-4 pb-4 text-sm text-slate-300">
          <InfoBlock label="Building Block" value={step.mapping.buildingBlock} dark />
          <InfoBlock label="Protocol / Standard" value={step.mapping.protocol} dark />
          <InfoBlock label="Service Definition" value={step.mapping.serviceDefinition} dark />
          <InfoBlock label="Architectural Alignment & Audit Criteria" value={step.mapping.auditCriteria} dark />
        </div>
      </details>

      <details className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Show technical details
        </summary>
        <p className="px-4 pb-4 font-mono text-xs leading-5 text-slate-300">{step.technicalDetails}</p>
      </details>
    </article>
  );
}

function AddProcessStepForm({ onSubmit }: { onSubmit: (formData: FormData) => void }) {
  return (
    <form action={onSubmit} className="grid gap-4 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5 md:grid-cols-2">
      <Field name="title" label="Title" placeholder="Review data quality evidence" />
      <label className="grid gap-1 text-sm font-semibold text-slate-200">
        Actor / lane
        <select name="lane" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm">
          {lanes.map((lane) => (
            <option key={lane} value={lane}>
              {lane}
            </option>
          ))}
        </select>
      </label>
      <Field name="stage" label="Stage number" placeholder="5" />
      <Field name="responsibleActor" label="Responsible actor" placeholder="Governance / Trust" />
      <Field name="description" label="Description" placeholder="Plain-language process description" wide />
      <Field name="whatUserSees" label="What the user sees" placeholder="Visible business outcome" />
      <Field name="systemDoes" label="What the system does" placeholder="Behind-the-scenes platform work" />
      <Field name="successCriteria" label="Success criteria" placeholder="How stakeholders know it worked" />
      <Field name="miniSteps" label="Mini steps, comma-separated" placeholder="Review evidence, Approve, Verify" wide />
      <Field name="buildingBlock" label="Building Block" placeholder="Trust Framework" />
      <Field name="protocol" label="Protocol / Standard" placeholder="ODRL, DCAT, DID Core" />
      <Field name="serviceDefinition" label="Service Definition" placeholder="Policy Enforcement Service" />
      <Field name="auditCriteria" label="Audit criteria" placeholder="Evidence expected for audit" wide />
      <Field name="technicalDetails" label="Optional technical details" placeholder="Endpoints, payloads, logs" wide />
      <div className="md:col-span-2">
        <button className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" type="submit">
          Add process card locally
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, placeholder, wide = false }: { name: string; label: string; placeholder: string; wide?: boolean }) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-200 ${wide ? "md:col-span-2" : ""}`}>
      {label}
      <input
        name={name}
        placeholder={placeholder}
        className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-normal text-slate-100 placeholder:text-slate-600"
      />
    </label>
  );
}

function InfoBlock({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-xl border border-white/10 bg-white/[0.03] p-3" : "rounded-xl bg-slate-950/40 p-3"}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function ActorChip({ actor }: { actor: string }) {
  const lower = actor.toLowerCase();
  const color = lower.includes("provider")
    ? "bg-emerald-400/15 text-emerald-100"
    : lower.includes("governance") || lower.includes("trust")
      ? "bg-amber-400/15 text-amber-100"
      : lower.includes("verifier")
        ? "bg-purple-400/15 text-purple-100"
        : "bg-sky-400/15 text-sky-100";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${color}`}>{actor}</span>;
}
