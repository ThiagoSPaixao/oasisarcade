import { lazy } from "react";
import type { GameDefinition, GameSlug } from "./game-types";

/**
 * GAME REGISTRY — fonte única da parte técnica de cada jogo.
 * O banco (tabela games) descreve o jogo; este registro executa o jogo.
 * Os componentes são carregados sob demanda para não pesar o bundle inicial.
 */
export const GAME_REGISTRY: Record<GameSlug, GameDefinition> = {
  tetris: {
    slug: "tetris",
    component: lazy(() => import("@/components/games/TetrisGame").then((m) => ({ default: m.TetrisGame }))),
    cover: "/assets/cover-tetris-neon.jpg",
    controls: "tetris",
    controlHint: "Analógico move · centro (A) gira · botão ao lado desce rápido",
    difficultyHint: "Peças caem mais rápido e cada linha vale mais.",
    supportedOptions: ["difficulty", "tetrisFixedPad", "tetrisGhost"],
    supportsRanking: true,
    supportsXp: true,
    musicTheme: "korobeiniki",
  },
  snake: {
    slug: "snake",
    component: lazy(() => import("@/components/games/SnakeGame").then((m) => ({ default: m.SnakeGame }))),
    cover: "/assets/cover-snake-neon.jpg",
    controls: "directional",
    controlHint: "Setas / WASD ou D-Pad para mover",
    difficultyHint: "Quanto mais rápida a cobra, mais pontos por fruta.",
    supportedOptions: ["difficulty", "snakeWrap"],
    supportsRanking: true,
    supportsXp: true,
    musicTheme: null,
  },
  memoria: {
    slug: "memoria",
    component: lazy(() => import("@/components/games/MemoryGame").then((m) => ({ default: m.MemoryGame }))),
    cover: "/assets/cover-memoria-brain.jpg",
    controls: "none",
    controlHint: "Toque nas cartas para achar os pares",
    difficultyHint: "Mais pares para encontrar no tabuleiro.",
    supportedOptions: ["difficulty"],
    supportsRanking: true,
    supportsXp: true,
    musicTheme: null,
  },
  "space-shooter": {
    slug: "space-shooter",
    component: lazy(() => import("@/components/games/ShooterGame").then((m) => ({ default: m.ShooterGame }))),
    cover: "/assets/cover-shooter.jpg",
    controls: "full",
    controlHint: "← → move · A atira · B pausa",
    difficultyHint: "Frota mais veloz e mais tiros inimigos.",
    supportedOptions: ["difficulty"],
    supportsRanking: true,
    supportsXp: true,
    musicTheme: null,
    aliases: ["nave"],
  },
  breakout: {
    slug: "breakout",
    component: lazy(() => import("@/components/games/BreakoutGame").then((m) => ({ default: m.BreakoutGame }))),
    cover: "/assets/cover-breakout.jpg",
    controls: "full",
    controlHint: "← → move a raquete · A começa · B pausa",
    difficultyHint: "Bola mais rápida e raquete menor.",
    supportedOptions: ["difficulty"],
    supportsRanking: true,
    supportsXp: true,
    musicTheme: null,
    aliases: ["arkanoid"],
  },
  pong: {
    slug: "pong",
    component: lazy(() => import("@/components/games/PongGame").then((m) => ({ default: m.PongGame }))),
    cover: "/assets/cover-pong.jpg",
    controls: "full",
    controlHint: "← → move a raquete · A começa · B pausa",
    difficultyHint: "Bola mais rápida e CPU mais esperta.",
    supportedOptions: ["difficulty"],
    supportsRanking: true,
    supportsXp: true,
    musicTheme: null,
  },
};

export const GAME_SLUGS = Object.keys(GAME_REGISTRY) as GameSlug[];

const ALIASES: Record<string, GameSlug> = Object.fromEntries(
  GAME_SLUGS.flatMap((slug) => (GAME_REGISTRY[slug].aliases ?? []).map((alias) => [alias, slug])),
);

/** Normaliza um slug recebido da rota/banco para o slug canônico do registro. */
export function resolveSlug(raw: string | null | undefined): GameSlug | null {
  if (!raw) return null;
  if (raw in GAME_REGISTRY) return raw as GameSlug;
  return ALIASES[raw] ?? null;
}

export function getDefinition(raw: string | null | undefined): GameDefinition | null {
  const slug = resolveSlug(raw);
  return slug ? GAME_REGISTRY[slug] : null;
}
