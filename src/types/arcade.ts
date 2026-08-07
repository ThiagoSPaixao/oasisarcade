export type PlanStatus = "free" | "premium";
export type GameCategory = "mais_jogados" | "classicos_8bits";
export type GameState = "playable" | "soon";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  plano_status: PlanStatus;
};

export type Game = {
  slug: string;
  name: string;
  description: string;
  category: GameCategory;
  is_premium: boolean;
  thumbnail: string | null;
  state: GameState;
  sort_order: number;
};

export type Direction = "up" | "down" | "left" | "right";
export type ActionButton = "a" | "b";

export const XP_PER_LEVEL = 500;
