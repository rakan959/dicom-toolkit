const STORAGE_KEY = "ui.theme" as const;

export type ThemeMode = "light" | "dark";

export function getSystemPref(): ThemeMode {
  try {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "dark"; // safe default for app aesthetics
  }
}

export function storeTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore storage errors (private mode)
  }
}

export function getStoredTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function applyTheme(mode?: ThemeMode) {
  const m = mode || getStoredTheme() || getSystemPref();
  const root = document.documentElement;
  if (m === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  const currentStored = getStoredTheme();
  if (m !== currentStored) {
    storeTheme(m);
  }
}
