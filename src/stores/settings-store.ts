import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_GAME_OPTIONS, type GameOptions } from "@/lib/game-options";

export type ThemeMode = "dark" | "light";
export type ControlMode = "dpad" | "analog";

type SettingsState = {
  theme: ThemeMode;
  controlMode: ControlMode;
  /** Configurações isoladas por jogo (slug -> opções). */
  gameSettings: Record<string, Partial<GameOptions>>;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setControlMode: (mode: ControlMode) => void;
  setGameOption: (slug: string, patch: Partial<GameOptions>) => void;
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
      gameSettings: {},
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
      setControlMode: (controlMode) => set({ controlMode }),
      setGameOption: (slug, patch) =>
        set((state) => ({
          gameSettings: {
            ...state.gameSettings,
            [slug]: { ...state.gameSettings[slug], ...patch },
          },
        })),
    }),
    {
      name: "oasis-arcade-settings",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

/** Opções completas de um jogo, com os padrões preenchidos. */
export function useGameOptions(slug: string): GameOptions {
  const stored = useSettingsStore((s) => s.gameSettings[slug]);
  return useMemo(() => ({ ...DEFAULT_GAME_OPTIONS, ...stored }), [stored]);
}
