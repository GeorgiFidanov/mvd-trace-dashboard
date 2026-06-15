"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PinkPantherMark } from "./PinkPantherMark";

const nav = [
  ["Overview", "/"],
  ["Use Cases", "/use-cases"],
  ["Scenario Wizard", "/scenario-wizard"],
  ["Execution History", "/execution-history"],
  ["Advanced Diagnostics", "/advanced-diagnostics"],
  ["Architecture", "/architecture"],
  ["Deployment Status", "/deployment-status"],
  ["Settings", "/settings"],
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"edc" | "fiware">("edc");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("mvd-theme");
      if (saved === "fiware" || saved === "edc") setTheme(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "edc" ? "fiware" : "edc";
      window.localStorage.setItem("mvd-theme", next);
      return next;
    });
  }

  const accent = theme === "edc" ? "cyan" : "orange";
  const shellBg =
    theme === "edc"
      ? "bg-slate-950 text-slate-100"
      : "bg-[#160f05] text-orange-50";
  const sidebarBg = theme === "edc" ? "bg-slate-950/95" : "bg-[#120c04]/95";
  const activeClass =
    theme === "edc"
      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
      : "border-orange-300/50 bg-orange-300/15 text-orange-100";

  return (
    <div className={`min-h-screen ${shellBg}`}>
      <aside className={`fixed inset-y-0 left-0 hidden w-80 border-r border-white/10 ${sidebarBg} p-5 backdrop-blur md:block`}>
        <Link href="/" className="flex items-center gap-3 rounded-2xl transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-pink-300/60">
          <PinkPantherMark className="h-12 w-12 shrink-0" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-300">Pink Panther</div>
            <h1 className="mt-1 text-2xl font-bold leading-tight">Dataspace Validation Platform</h1>
          </div>
        </Link>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Guided use-case validation for EDC MVD and FIWARE, with technical traces available on demand.
        </p>
        <button
          type="button"
          onClick={toggleTheme}
          className={`mt-5 flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 ${
            accent === "cyan" ? "bg-cyan-300/10 text-cyan-100" : "bg-orange-300/10 text-orange-100"
          }`}
          aria-label="Toggle EDC and FIWARE visual theme"
        >
          <span>{theme === "edc" ? "Moon theme · EDC MVD" : "Sun theme · FIWARE"}</span>
          <span className="text-lg">{theme === "edc" ? "☾" : "☀"}</span>
        </button>
        <nav className="mt-8 grid gap-1">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition hover:bg-white/10 hover:text-white ${
                isActive(pathname, href) ? activeClass : "border-transparent text-slate-300"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 rounded-2xl border border-pink-400/20 bg-pink-400/10 p-4 text-xs leading-5 text-pink-100">
          Built by Pink Panther. Scenario mode explains what happened and why; Advanced Diagnostics keeps
          the protocol evidence available.
        </div>
      </aside>
      <main className="flex min-h-screen flex-col px-4 py-6 md:ml-80 md:px-10">
        <div className="flex-1">{children}</div>
        <footer className="mt-10 border-t border-white/10 py-5 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PinkPantherMark className="h-9 w-9" />
              <div>
                <p className="font-semibold text-slate-200">Pink Panther · Dataspace Validation Dashboard</p>
                <p className="text-xs">Built for FIWARE and EDC MVD learning, validation, and project evidence.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Semester 4 group project · EDC MVD / FIWARE dashboard</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
