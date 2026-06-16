"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PinkPantherMark } from "./PinkPantherMark";
import { ThemeProvider, themeShell, themeSidebar, type AppTheme } from "@/lib/themeContext";

const nav = [
  ["Overview", "/"],
  ["Core Demo Playground", "/scenario-wizard"],
  ["Technical Use Cases", "/use-cases"],
  ["Execution History", "/execution-history"],
  ["Advanced Diagnostics", "/advanced-diagnostics"],
  ["Architecture", "/architecture"],
  ["Deployment Status", "/deployment-status"],
  ["Settings", "/settings"],
  ["Fiware", "/fiware"],
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onFiwarePage = pathname === "/fiware" || pathname.startsWith("/fiware/");
  const [theme, setTheme] = useState<AppTheme>("edc");
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const activeClass =
    theme === "edc"
      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
      : "border-orange-400/50 bg-orange-200/60 text-orange-950";

  const sidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-3 rounded-2xl transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-pink-300/60">
        <PinkPantherMark className="h-12 w-12 shrink-0" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-300">Pink Panther</div>
          <h1 className="mt-1 text-2xl font-bold leading-tight">Dataspace Validation Platform</h1>
        </div>
      </Link>
      <p className="mt-3 text-sm leading-6 opacity-70">
        Guided Core Demo playground for onboarding and Show & Tell — with EDC MVD technical scenarios on demand.
      </p>
      <button
        type="button"
        onClick={toggleTheme}
        className={`mt-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:bg-white/10 ${
          theme === "edc"
            ? "border-white/10 bg-cyan-300/10 text-cyan-100"
            : "border-orange-300/60 bg-orange-100 text-orange-950"
        }`}
        aria-label="Toggle dark and light theme"
      >
        <span>{theme === "edc" ? "Dark theme" : "Light theme"}</span>
        <span className="text-lg">{theme === "edc" ? "☾" : "☀"}</span>
      </button>
      <nav className="mt-8 grid gap-1">
        {nav.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition hover:bg-white/10 ${
              isActive(pathname, href) ? activeClass : "border-transparent opacity-80 hover:opacity-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div
        className={`mt-8 rounded-2xl border p-4 text-xs leading-5 ${
          theme === "edc" ? "border-pink-400/20 bg-pink-400/10 text-pink-100" : "border-pink-300/40 bg-pink-100/80 text-pink-900"
        }`}
      >
        Built by Pink Panther. Scenario mode explains what happened and why; Advanced Diagnostics keeps the protocol
        evidence available.
      </div>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <div data-theme={theme} className={`min-h-screen ${themeShell(theme)}`}>
        <header className={`fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden ${themeSidebar(theme)}`}>
          <Link href="/" className="flex items-center gap-2">
            <PinkPantherMark className="h-9 w-9 shrink-0" />
            <span className="text-sm font-bold">Pink Panther</span>
          </Link>
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </header>

        {mobileOpen ? (
          <div className={`fixed inset-0 z-30 md:hidden ${themeShell(theme)}`}>
            <div className="h-14" />
            <aside className={`h-[calc(100%-3.5rem)] overflow-y-auto border-t p-5 ${themeSidebar(theme)}`}>{sidebarContent}</aside>
          </div>
        ) : null}

        <aside className={`fixed inset-y-0 left-0 hidden w-80 border-r p-5 backdrop-blur md:block ${themeSidebar(theme)}`}>
          {sidebarContent}
        </aside>

        <main className="flex min-h-screen flex-col px-4 pb-6 pt-16 md:ml-80 md:px-10 md:pt-6">
          <div className="flex-1">{children}</div>
          <footer className={`mt-10 border-t py-5 text-sm ${theme === "edc" ? "border-white/10 text-slate-400" : "border-orange-200/60 text-stone-600"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PinkPantherMark className="h-9 w-9" />
                <div>
                  <p className={`font-semibold ${theme === "edc" ? "text-slate-200" : "text-stone-800"}`}>
                    Pink Panther · Dataspace Validation Dashboard
                  </p>
                  <p className="text-xs opacity-70">
                    {onFiwarePage
                      ? "FIWARE dataspace preparation and audit rehearsal track."
                      : "EDC MVD validation, Core Demo onboarding, and Show & Tell evidence."}
                  </p>
                </div>
              </div>
              <p className="text-xs opacity-60">
                {onFiwarePage ? "Semester 4 group project · FIWARE preparation track" : "Semester 4 group project · EDC MVD dashboard"}
              </p>
            </div>
          </footer>
        </main>
      </div>
    </ThemeProvider>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
