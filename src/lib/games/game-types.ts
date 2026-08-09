import type { ComponentType, LazyExoticComponent } from "react";
import type { Difficulty } from "@/lib/game-options";
import type { MusicTheme } from "@/lib/sound";
import type { Game, GameCategory } from "@/types/arcade";

/** Slugs técnicos estáveis: usados em rotas, favoritos, user_scores e ranking. */
export type GameSlug = "tetris" | "snake" | "memoria" | "space-shooter" | "breakout" | "pong";

export type GameDifficulty = Difficulty;
export type { GameCategory };

/** Status final do jogo no catálogo (banco + disponibilidade real do código). */
export type GameStatus = "available" | "coming_soon";

/**
 * Formato do controle virtual exigido pelo jogo.
 * - none: sem controle (toque na própria tela do jogo)
 * - directional: apenas direcional (seta ou analógico, conforme configuração)
 * - full: direcional + botões A/B
 * - tetris: controle exclusivo do Tetris
 */
export type GameControls = "none" | "directional" | "full" | "tetris";

/** Opções específicas que o menu de ajustes do jogo deve exibir. */
export type GameOptionKey = "difficulty" | "snakeWrap" | "tetrisGhost" | "tetrisFixedPad";

export type GameComponentProps = { onGameOver: (score: number) => void };

/** Parte técnica do jogo: vive no código, nunca no banco. */
export type GameDefinition = {
  slug: GameSlug;
  /** Componente carregado sob demanda (code splitting). */
  component: LazyExoticComponent<ComponentType<GameComponentProps>> | null;
  /** Capa local em /public/assets (fallback: thumbnail do banco). */
  cover: string | null;
  controls: GameControls;
  /** Dica exibida abaixo do controle. */
  controlHint: string;
  /** Dica de dificuldade no menu de ajustes. */
  difficultyHint: string;
  supportedOptions: GameOptionKey[];
  supportsRanking: boolean;
  supportsXp: boolean;
  /** Tema de música tocado durante a partida (null = silêncio, só efeitos). */
  musicTheme: MusicTheme | null;
  /** Slugs antigos que devem redirecionar para este jogo. */
  aliases?: string[];
};

/** Metadados do banco + definição técnica: o que a UI consome. */
export type CatalogGame = Game & {
  slug: GameSlug;
  cover: string | null;
  status: GameStatus;
  definition: GameDefinition;
};
