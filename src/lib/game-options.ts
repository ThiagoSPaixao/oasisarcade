export type Difficulty = "easy" | "normal" | "hard";

export type GameOptions = {
  difficulty: Difficulty;
  /** Snake: atravessar bordas em vez de morrer. */
  snakeWrap: boolean;
  /** Tetris: sombra (ghost) da peça na base. */
  tetrisGhost: boolean;
};

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  difficulty: "normal",
  snakeWrap: false,
  tetrisGhost: true,
};

/** Cada nível é mais rápido/agressivo e vale mais pontos. */
export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; short: string; multiplier: number; speed: number }
> = {
  easy: { label: "Fácil", short: "FÁCIL", multiplier: 1, speed: 0.82 },
  normal: { label: "Médio", short: "MÉDIO", multiplier: 1.5, speed: 1 },
  hard: { label: "Difícil", short: "DIFÍCIL", multiplier: 2, speed: 1.28 },
};

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

/** Pares no jogo da memória por dificuldade. */
export const MEMORY_PAIRS: Record<Difficulty, number> = { easy: 6, normal: 8, hard: 10 };

export const gain = (base: number, difficulty: Difficulty) =>
  Math.round(base * DIFFICULTY_META[difficulty].multiplier);
