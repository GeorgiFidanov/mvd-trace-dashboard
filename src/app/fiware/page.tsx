import { AppShell } from "@/components/AppShell";
import Link from "next/link";

export default function FiwarePage() {
  const steps = [
    {
      title: "Onboard participant",
      text: "Prepare organisation identities, roles, and credentials before any protected data is requested.",
      actors: ["Consumer POV", "Governance / Trust"],
      minis: ["Configure organisation DIDs", "View users by role", "Create / map a user"],
      mapping: ["Trust Framework", "W3C DID Core", "Participant Agent Services"],
    },
    {
      title: "Create / publish data product",
      text: "Describe a dataset, attach usage rules, and publish the offer through the catalogue path.",
      actors: ["Provider POV", "Usage Control"],
      minis: ["Build or upload asset", "Create protected asset", "Publish product offer"],
      mapping: ["Publication & Discovery", "DCAT / JSON-LD", "Marketplace Service"],
    },
    {
      title: "Request data access",
      text: "Select a product and submit an access request so trust and policy can be evaluated.",
      actors: ["Consumer POV", "Provider Approval", "Agreement"],
      minis: ["Select requested data", "Submit request/agreement"],
      mapping: ["Access Policies", "ODRL", "Contract Management Service"],
    },
    {
      title: "Access & use data",
      text: "Prove identity, receive a token, and access the selected data through a controlled path.",
      actors: ["Consumer POV", "Verifier POV", "Provider Data"],
      minis: ["Prove identity and get token", "Render selected data"],
      mapping: ["Data Exchange", "OAuth 2.0 Bearer", "Policy Enforcement Service"],
    },
    {
      title: "Offboard / revoke access",
      text: "Remove trust or access and prove the next access attempt is denied.",
      actors: ["Governance POV", "Provider Control"],
      minis: ["Revoke trust", "Retry access", "Confirm denial"],
      mapping: ["Trust Framework", "Credential Status", "Credential Verification Service"],
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-pink-400/20 via-slate-900 to-cyan-400/15 p-8 shadow-2xl shadow-slate-950/20 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">FIWARE Data Space · Preparation Track</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight text-white">Guided FIWARE demo and audit preparation</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              This page mirrors the uploaded FIWARE guided-demo style so stakeholders can rehearse the flow, audit
              language, and DSSC mappings. The executable implementation remains the EDC MVD track for now.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/use-cases" className="rounded-xl bg-pink-300 px-4 py-2 text-sm font-black uppercase tracking-wide text-slate-950 hover:bg-pink-200">
                Open available EDC track
              </Link>
              <Link href="/" className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-black uppercase tracking-wide text-slate-100 hover:bg-white/10">
                Back to platform choice
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-200">Presentation & audit angle</p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
              <p><strong className="text-white">Consumer POV:</strong> proves identity and requests authorized data access.</p>
              <p><strong className="text-white">Provider POV:</strong> structures protected assets and publishes governed offers.</p>
              <p><strong className="text-white">Governance POV:</strong> validates trust anchors, policies, and audit evidence.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 text-slate-100 shadow-xl shadow-slate-950/20">
              <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-start">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-300 text-lg font-black text-slate-950">
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.actors.map((actor) => (
                      <span key={actor} className={actorClass(actor)}>
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-100">
                  Preparation
                </span>
              </div>
              <details className="group mt-5 rounded-2xl border border-white/10 bg-slate-950/60">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wide text-cyan-100">
                  <span>Mini executable steps</span>
                  <span className="rounded-full bg-cyan-300/15 px-2 py-1 text-cyan-100">Open / close</span>
                </summary>
                <div className="grid gap-2 px-4 pb-4">
                  {step.minis.map((mini, miniIndex) => (
                    <div key={mini} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15 text-xs font-black text-cyan-100">
                        {index + 1}
                        {String.fromCharCode(65 + miniIndex)}
                      </span>
                      <span className="text-sm font-semibold text-slate-200">{mini}</span>
                      <span className="text-xs font-black uppercase tracking-wide text-cyan-200">Ready</span>
                    </div>
                  ))}
                </div>
              </details>
              <details className="mt-3 rounded-2xl border border-white/10 bg-slate-950/80 text-slate-200">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-300">
                  <span>DSSC mapping & audit criteria</span>
                  <span className="rounded-full bg-pink-300/15 px-2 py-1 text-pink-100">Open / close</span>
                </summary>
                <div className="grid gap-3 px-4 pb-4 text-sm md:grid-cols-2">
                  <Panel label="Building Block" value={step.mapping[0]} />
                  <Panel label="Protocol / Standard" value={step.mapping[1]} />
                  <Panel label="Service Definition" value={step.mapping[2]} />
                  <Panel label="Architectural Alignment & Audit Criteria" value="Confirm the business action leaves evidence that can be reviewed without reading raw Kubernetes logs." />
                </div>
              </details>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

function Panel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function actorClass(actor: string) {
  const lower = actor.toLowerCase();
  const color = lower.includes("provider")
    ? "bg-emerald-400/15 text-emerald-100"
    : lower.includes("governance") || lower.includes("agreement") || lower.includes("usage")
      ? "bg-amber-400/15 text-amber-100"
      : lower.includes("verifier")
        ? "bg-purple-400/15 text-purple-100"
        : "bg-sky-400/15 text-sky-100";
  return `rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${color}`;
}
