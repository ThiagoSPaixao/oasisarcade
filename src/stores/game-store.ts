import { create } from "zustand";
import type { ActionButton, Direction } from "@/types/arcade";

export type GameStatus = "idle" | "running" | "paused" | "over";

type DirectionInput = { direction: Direction; at: number } | null;
type ActionInput = { action: ActionButton; at: number } | null;

type GameState = {
  activeGame: string | null;
  status: GameStatus;
  score: number;
  best: number;
  directionInput: DirectionInput;
  actionInput: ActionInput;
  setActiveGame: (slug: string | null) => void;
  setStatus: (status: GameStatus) => void;
  setScore: (score: number) => void;
  setBest: (best: number) => void;
  pressDirection: (direction: Direction) => void;
  pressAction: (action: ActionButton) => void;
  resetGame: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  activeGame: null,
  status: "idle",
  score: 0,
  best: 0,
  directionInput: null,
  actionInput: null,
  setActiveGame: (activeGame) =>
    set({ activeGame, status: "idle", score: 0, directionInput: null, actionInput: null }),
  setStatus: (status) => set({ status }),
  setScore: (score) => set({ score }),
  setBest: (best) => set({ best }),
  pressDirection: (direction) => set({ directionInput: { direction, at: Date.now() } }),
  pressAction: (action) => set({ actionInput: { action, at: Date.now() } }),
  resetGame: () => set({ status: "idle", score: 0, directionInput: null, actionInput: null }),
}));
