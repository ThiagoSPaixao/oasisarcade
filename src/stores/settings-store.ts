import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";
export type ControlMode = "dpad" | "analog";

type SettingsState = {
  theme: ThemeMode;
  controlMode: ControlMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setControlMode: (mode: ControlMode) => void;
};

/** Aplica a classe de tema no <html> (dark é o padrão do arcade). */
export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      controlMode: "dpad",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
      setControlMode: (controlMode) => set({ controlMode }),
    }),
    {
      name: "oasis-arcade-settings",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
