import coverTetrisNeon from "@/assets/cover-tetris-neon.jpg.asset.json";
import coverSnakeNeon from "@/assets/cover-snake-neon.jpg.asset.json";
import coverMemoriaBrain from "@/assets/cover-memoria-brain.jpg.asset.json";
import coverShooter from "@/assets/cover-shooter.jpg";
import coverBreakout from "@/assets/cover-breakout.jpg";
import coverPong from "@/assets/cover-pong.jpg";

/** Capas neon por jogo, usadas nos cards e no carrossel do dashboard. */
export const GAME_COVERS: Record<string, string> = {
  tetris: coverTetrisNeon.url,
  snake: coverSnakeNeon.url,
  memoria: coverMemoriaBrain.url,


  "space-shooter": coverShooter,
  breakout: coverBreakout,
  pong: coverPong,
};

export function gameCover(slug: string, fallback?: string | null): string | null {
  return GAME_COVERS[slug] ?? fallback ?? null;
}
