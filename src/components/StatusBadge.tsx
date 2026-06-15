import type { UseCaseStatus, WizardStepStatus } from "@/lib/useCases";

type Status = UseCaseStatus | WizardStepStatus | "offline";

const labels: Record<Status, string> = {
  ready: "Ready",
  running: "Running",
  success: "Done",
  warning: "Warning",
  failed: "Failed",
  pending: "Pending",
  offline: "Offline",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={statusClass(status)}>{labels[status]}</span>;
}

function statusClass(status: Status) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
  if (status === "success" || status === "ready") return `${base} bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30`;
  if (status === "running") return `${base} animate-pulse bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/30`;
  if (status === "warning" || status === "pending") return `${base} bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/30`;
  return `${base} bg-red-400/15 text-red-100 ring-1 ring-red-300/30`;
}
