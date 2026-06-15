"use client";

import { createContext, useContext } from "react";

export type AppTheme = "edc" | "fiware";

const ThemeContext = createContext<AppTheme>("edc");

export function ThemeProvider({ theme, children }: { theme: AppTheme; children: React.ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

/** Pick theme-aware Tailwind class strings. */
export function tc(theme: AppTheme, edc: string, fiware: string) {
  return theme === "fiware" ? fiware : edc;
}

export function themeShell(theme: AppTheme) {
  return tc(
    theme,
    "bg-slate-950 text-slate-100",
    "bg-[#fff7ed] text-stone-900",
  );
}

export function themeSidebar(theme: AppTheme) {
  return tc(
    theme,
    "bg-slate-950/95 border-white/10",
    "bg-[#ffedd5]/95 border-orange-200/50",
  );
}

export function themePanel(theme: AppTheme) {
  return tc(
    theme,
    "border-white/10 bg-slate-900/80",
    "border-orange-200/70 bg-white/80 shadow-sm",
  );
}

export function themePanelSoft(theme: AppTheme) {
  return tc(
    theme,
    "border-white/10 bg-slate-950/60",
    "border-orange-200/60 bg-orange-50/90",
  );
}

export function themeHeading(theme: AppTheme) {
  return tc(theme, "text-white", "text-stone-900");
}

export function themeMuted(theme: AppTheme) {
  return tc(theme, "text-slate-400", "text-stone-600");
}

export function themeBody(theme: AppTheme) {
  return tc(theme, "text-slate-300", "text-stone-700");
}

export function themeAccentLabel(theme: AppTheme) {
  return tc(theme, "text-cyan-200", "text-orange-700");
}

export function themePinkLabel(theme: AppTheme) {
  return tc(theme, "text-pink-200", "text-pink-700");
}
