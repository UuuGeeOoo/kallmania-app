"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "dark" | "light";

const STORAGE_KEY = "kallmania.theme";

/* ── Tiny external store: source of truth = the class on <html> ──
   The pre-hydration script in layout.tsx applies the persisted theme before
   React mounts, so reading the DOM class here is always consistent (no
   hydration mismatch, no setState-in-effect). */
let listeners: (() => void)[] = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("theme-light") ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("theme-light", next === "light");
  try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
}

/** Read + switch the site theme (shared by every toggle on the page). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    theme,
    toggle: () => {
      const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
      applyTheme(next);
      listeners.forEach((l) => l());
    },
  };
}

/** Sun/moon switch — flips the whole site between the dark liquid-glass and light themes. */
export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-400 backdrop-blur transition hover:bg-white/10 hover:text-[#8b7ff5]",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
