import coverTetrisNeon from "@/assets/cover-tetris-neon.png.asset.json";
import coverSnake from "@/assets/cover-snake.jpg";
import coverMemoria from "@/assets/cover-memoria.jpg";
import coverShooter from "@/assets/cover-shooter.jpg";
import coverBreakout from "@/assets/cover-breakout.jpg";
import coverPong from "@/assets/cover-pong.jpg";

/** Capas neon por jogo, usadas nos cards e no carrossel do dashboard. */
export const GAME_COVERS: Record<string, string> = {
  tetris: coverTetrisNeon.url,
  snake: coverSnake,
  memoria: coverMemoria,
  "space-shooter": coverShooter,
  breakout: coverBreakout,
  pong: coverPong,
};

export function gameCover(slug: string, fallback?: string | null): string | null {
  return GAME_COVERS[slug] ?? fallback ?? null;
}
