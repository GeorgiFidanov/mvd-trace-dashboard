"use client";

import { useId } from "react";
import type { WizardStepStatus } from "@/lib/useCases";

type Props = {
  activeStepId: string;
  states: Record<string, WizardStepStatus>;
  assetLabel?: string;
  consumerLabel: string;
  providerLabel: string;
};

type NodeId = "consumer" | "provider" | "governance" | "catalog" | "data";

type NodeDef = { id: NodeId; label: string; x: number; y: number; w: number };

const nodes: NodeDef[] = [
  { id: "consumer", label: "Consumer CP/DP", x: 11, y: 48, w: 26 },
  { id: "provider", label: "Provider CP/DP", x: 89, y: 48, w: 26 },
  { id: "governance", label: "IdentityHub / Issuer", x: 50, y: 13, w: 30 },
  { id: "catalog", label: "Catalog (DSP)", x: 50, y: 68, w: 24 },
  { id: "data", label: "Protected data", x: 50, y: 86, w: 24 },
];

type FlowKind = "health" | "publish" | "negotiate" | "transfer" | "terminate";

type FlowSpec = {
  segments: { from: NodeId; to: NodeId }[];
  label: string;
  kind: FlowKind;
  showDataNode?: boolean;
};

const paths: Record<string, FlowSpec> = {
  "core-onboard": {
    segments: [{ from: "consumer", to: "governance" }],
    label: "Health + trust probes (CP, DP, IdentityHub, Vault)",
    kind: "health",
  },
  "core-publish": {
    segments: [{ from: "provider", to: "catalog" }],
    label: "Catalog request → asset offers visible",
    kind: "publish",
  },
  "core-request-access": {
    segments: [{ from: "consumer", to: "provider" }],
    label: "Contract negotiation + ODRL policy check",
    kind: "negotiate",
  },
  "core-access-data": {
    segments: [
      { from: "provider", to: "consumer" },
      { from: "catalog", to: "data" },
    ],
    label: "Transfer opens proxy flow → data payload delivered",
    kind: "transfer",
    showDataNode: true,
  },
  "core-offboard": {
    segments: [
      { from: "governance", to: "consumer" },
      { from: "consumer", to: "data" },
    ],
    label: "Revoke membership VC → terminate transfer → deny data fetch",
    kind: "terminate",
    showDataNode: true,
  },
};

function node(id: NodeId) {
  return nodes.find((n) => n.id === id)!;
}

function motionPath(from: NodeId, to: NodeId) {
  const a = node(from);
  const b = node(to);
  return `M${a.x},${a.y} L${b.x},${b.y}`;
}

function NodeBadge({
  def,
  tone,
}: {
  def: NodeDef;
  tone: "idle" | "active-running" | "active-done";
}) {
  const fill =
    tone === "active-running"
      ? "rgba(244,114,182,0.18)"
      : tone === "active-done"
        ? "rgba(52,211,153,0.18)"
        : "rgba(15,23,42,0.92)";
  const stroke =
    tone === "active-running"
      ? "rgba(244,114,182,0.75)"
      : tone === "active-done"
        ? "rgba(52,211,153,0.75)"
        : tone === "idle"
          ? "rgba(148,163,184,0.35)"
          : "rgba(34,211,238,0.55)";
  const text =
    tone === "idle" ? "#94a3b8" : tone === "active-running" ? "#fbcfe8" : tone === "active-done" ? "#a7f3d0" : "#a5f3fc";

  return (
    <g>
      <rect
        x={def.x - def.w / 2}
        y={def.y - 5.5}
        width={def.w}
        height={11}
        rx={3.2}
        fill={fill}
        stroke={stroke}
        strokeWidth={0.45}
      />
      <text x={def.x} y={def.y + 1.2} textAnchor="middle" fontSize={3.1} fontWeight={600} fill={text}>
        {def.label}
      </text>
    </g>
  );
}

function shortenLine(from: NodeDef, to: NodeDef, inset = 7) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    x1: round(from.x + ux * inset),
    y1: round(from.y + uy * inset),
    x2: round(to.x - ux * inset),
    y2: round(to.y - uy * inset),
  };
}

function FlowCanvas({
  spec,
  running,
  done,
  markerId,
  visibleNodeIds,
  activeNodeIds,
}: {
  spec: FlowSpec;
  running: boolean;
  done: boolean;
  markerId: string;
  visibleNodeIds: Set<NodeId>;
  activeNodeIds: Set<NodeId>;
}) {
  const active = running || done;

  return (
    <svg className="h-full w-full" viewBox="0 0 100 100" role="img" aria-hidden>
      <defs>
        <marker
          id={markerId}
          markerUnits="userSpaceOnUse"
          viewBox="0 0 4 4"
          markerWidth="4"
          markerHeight="4"
          refX="3.5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L4,2 L0,4 Z" fill="rgba(34,211,238,0.7)" />
        </marker>
        <marker
          id={`${markerId}-red`}
          markerUnits="userSpaceOnUse"
          viewBox="0 0 4 4"
          markerWidth="4"
          markerHeight="4"
          refX="3.5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L4,2 L0,4 Z" fill="rgba(248,113,113,0.75)" />
        </marker>
        <filter id={`${markerId}-glow`}>
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {spec.segments.map((segment, index) => {
        const from = node(segment.from);
        const to = node(segment.to);
        const terminate = spec.kind === "terminate";
        const isPrimary = index === 0;
        const { x1, y1, x2, y2 } = shortenLine(from, to);
        return (
          <line
            key={`${segment.from}-${segment.to}-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={terminate && done ? "rgba(248,113,113,0.55)" : "rgba(34,211,238,0.42)"}
            strokeWidth={0.65}
            strokeDasharray={spec.kind === "negotiate" ? "2 1.4" : "2.6 1.6"}
            markerEnd={isPrimary ? (terminate && done ? `url(#${markerId}-red)` : `url(#${markerId})`) : undefined}
          />
        );
      })}

      {spec.kind === "health" && active
        ? spec.segments.flatMap((segment) => [segment.from, segment.to]).map((id, i) => (
            <circle
              key={`pulse-${id}-${i}`}
              cx={node(id).x}
              cy={node(id).y}
              r={3.2}
              fill="none"
              stroke="#34d399"
              strokeWidth={0.4}
            >
              {running ? <animate attributeName="r" values="2.2;5;2.2" dur="1.6s" repeatCount="indefinite" /> : null}
              {running ? <animate attributeName="opacity" values="0.35;1;0.35" dur="1.6s" repeatCount="indefinite" /> : null}
            </circle>
          ))
        : null}

      {spec.kind === "publish" && active ? (
        <>
          <rect x="-2.8" y="-2" width="5.6" height="4" rx="0.8" fill="#fbbf24" stroke="#d97706" strokeWidth="0.25">
            {running ? (
              <animateMotion dur="2.2s" repeatCount="indefinite" path={motionPath("provider", "catalog")} />
            ) : (
              <animateMotion dur="0.01s" repeatCount="1" fill="freeze" path={motionPath("provider", "catalog")} />
            )}
          </rect>
          {done ? (
            <circle cx={node("catalog").x} cy={node("catalog").y} r="2.6" fill="rgba(52,211,153,0.35)" />
          ) : null}
        </>
      ) : null}

      {spec.kind === "negotiate" && active ? (
        <>
          <circle r={2.1} fill={running ? "#f472b6" : "#34d399"} filter={`url(#${markerId}-glow)`}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={motionPath("consumer", "provider")} />
          </circle>
          <circle r={2.1} fill={running ? "#f472b6" : "#34d399"} filter={`url(#${markerId}-glow)`}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={motionPath("provider", "consumer")} />
          </circle>
          <g transform={`translate(${node("governance").x}, ${node("governance").y - 7})`}>
            <text textAnchor="middle" fontSize={4.2} fill={running ? "#f472b6" : "#34d399"}>
              ✍
            </text>
            {running ? <animate attributeName="opacity" values="0.35;1;0.35" dur="1.1s" repeatCount="indefinite" /> : null}
          </g>
        </>
      ) : null}

      {spec.kind === "transfer" && active ? (
        <>
          <circle r={2.4} fill={running ? "#f472b6" : "#34d399"} filter={`url(#${markerId}-glow)`}>
            <animateMotion
              dur={running ? "1.9s" : "0.01s"}
              repeatCount={running ? "indefinite" : "1"}
              path={motionPath("provider", "consumer")}
            />
          </circle>
          <circle cx={node("data").x} cy={node("data").y} r={3} fill="none" stroke="#34d399" strokeWidth={0.45}>
            {running ? <animate attributeName="r" values="2.2;4.2;2.2" dur="1.4s" repeatCount="indefinite" /> : null}
          </circle>
        </>
      ) : null}

      {spec.kind === "terminate" && active ? (
        <>
          {running ? (
            <circle r={1.9} fill="#f472b6">
              <animateMotion dur="1.7s" repeatCount="indefinite" path={motionPath("governance", "consumer")} />
            </circle>
          ) : null}
          <circle r={1.9} fill={done ? "#f87171" : "#f472b6"}>
            <animateMotion
              dur={running ? "1.7s" : "0.01s"}
              repeatCount={running ? "indefinite" : "1"}
              path={motionPath("consumer", "data")}
            />
          </circle>
          <g transform={`translate(${node("data").x}, ${node("data").y})`}>
            <line x1="-2.4" y1="-2.4" x2="2.4" y2="2.4" stroke="#f87171" strokeWidth={0.75} />
            <line x1="2.4" y1="-2.4" x2="-2.4" y2="2.4" stroke="#f87171" strokeWidth={0.75} />
          </g>
        </>
      ) : null}

      {nodes
        .filter((def) => visibleNodeIds.has(def.id))
        .map((def) => {
          const tone = activeNodeIds.has(def.id)
            ? running
              ? "active-running"
              : done
                ? "active-done"
                : "idle"
            : "idle";
          return <NodeBadge key={def.id} def={def} tone={tone} />;
        })}
    </svg>
  );
}

export function CoreDemoFlowViz({ activeStepId, states, assetLabel, consumerLabel, providerLabel }: Props) {
  const markerId = `core-flow-${useId().replace(/:/g, "")}`;
  const running = states[activeStepId] === "running";
  const done = states[activeStepId] === "success";
  const path = paths[activeStepId] ?? paths["core-onboard"];

  const activeNodeIds = new Set<NodeId>(path.segments.flatMap((segment) => [segment.from, segment.to]));
  if (path.kind === "negotiate") activeNodeIds.add("governance");
  if (path.kind === "publish") activeNodeIds.add("provider").add("catalog");

  const visibleNodeIds = new Set<NodeId>(nodes.map((n) => n.id).filter((id) => id !== "data" || path.showDataNode));

  const stepHints: Record<string, string> = {
    "core-onboard": "Probes light up on Consumer CP and IdentityHub when services respond.",
    "core-publish": "The asset offer travels from Provider into the DSP catalog.",
    "core-request-access": "Negotiation shuttles between Consumer and Provider while governance signs ODRL.",
    "core-access-data": "Data leaves Provider, crosses the proxy flow, and lands at Consumer.",
    "core-offboard": "Issuer revokes the membership VC; the transfer terminates and protected data is blocked.",
  };

  return (
    <section className="rounded-[2rem] border border-cyan-300/25 bg-cyan-300/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Live flow map</p>
      <h2 className="mt-2 text-lg font-bold text-white">What is literally happening in MVD</h2>
      <p className="mt-1 text-sm text-slate-400">
        {consumerLabel} ↔ {providerLabel}
        {assetLabel ? ` · asset ${assetLabel}` : ""}
      </p>

      <div className="mt-4 aspect-[5/3] min-h-[220px] rounded-2xl border border-white/10 bg-slate-950/70 p-1">
        <FlowCanvas
          spec={path}
          running={running}
          done={done}
          markerId={markerId}
          visibleNodeIds={visibleNodeIds}
          activeNodeIds={activeNodeIds}
        />
      </div>

      <div className="mt-3 space-y-1 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-200">
        <p>{path.label}</p>
        <p className="text-[11px] leading-5 text-slate-400">{stepHints[activeStepId] ?? stepHints["core-onboard"]}</p>
        {running ? <p className="text-[11px] font-semibold text-pink-200">In progress…</p> : null}
        {done ? <p className="text-[11px] font-semibold text-emerald-300">Completed</p> : null}
      </div>
    </section>
  );
}
