import type { GameSlug } from "@/lib/games/game-types";

/** Definição de conquista — o catálogo vive no banco, este tipo descreve o contrato. */
export type AchievementDefinition = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  hidden: boolean;
};

export type AchievementState = AchievementDefinition & {
  unlockedAt: string | null;
  progress: number;
  target: number;
};

export type DailyChallengeType = "score" | "plays" | "games";

/** Definição de desafio diário (espelho da tabela daily_challenges). */
export type DailyChallengeDefinition = {
  slug: string;
  type: DailyChallengeType;
  title: string;
  description: string;
  target: number;
  gameSlug: GameSlug | null;
  xpReward: number;
};

export type DailyChallengeState = DailyChallengeDefinition & {
  progress: number;
  completedAt: string | null;
};

export type PlayerStats = {
  playsTotal: number;
  recordsTotal: number;
  bestScore: number;
  gamesPlayed: string[];
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
};

export type GamificationState = {
  xp: number;
  level: number;
  stats: PlayerStats;
  challenge: DailyChallengeState | null;
  achievements: AchievementState[];
};

export type UnlockedAchievement = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
};

/** Resultado do processamento de uma partida (calculado 100% no servidor). */
export type GameResultOutcome = {
  xpGained: number;
  xp: number;
  level: number;
  levelUp: boolean;
  previousLevel: number;
  currentStreak: number;
  longestStreak: number;
  challengeCompleted: boolean;
  challengeXp: number;
  unlocked: UnlockedAchievement[];
};

export const EMPTY_STATE: GamificationState = {
  xp: 0,
  level: 1,
  stats: {
    playsTotal: 0,
    recordsTotal: 0,
    bestScore: 0,
    gamesPlayed: [],
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  },
  challenge: null,
  achievements: [],
};
