"use client";

import { useState } from "react";

export function JsonBlock({ value, title }: { value: unknown; title?: string }) {
  const [revealed, setRevealed] = useState(false);
  const text = JSON.stringify(value ?? null, null, 2);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-300">{title ?? "Raw JSON"}</span>
        <button className="text-xs text-slate-400 hover:text-white" onClick={() => setRevealed((current) => !current)}>
          {revealed ? "Hide" : "Reveal"}
        </button>
      </div>
      {revealed ? (
        <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-slate-100">{text}</pre>
      ) : (
        <div className="p-4 text-sm text-slate-400">Hidden by default. Click Reveal to inspect payloads.</div>
      )}
    </div>
  );
}
