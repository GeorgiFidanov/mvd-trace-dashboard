import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} {...props} />;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-950">{children}</h2>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-slate-500">{children}</p>;
}
