/** Capas neon por jogo, servidas como arquivos estáticos de /public/assets. */
export const GAME_COVERS: Record<string, string> = {
  tetris: "/assets/cover-tetris-neon.jpg",
  snake: "/assets/cover-snake-neon.jpg",
  memoria: "/assets/cover-memoria-brain.jpg",
  "space-shooter": "/assets/cover-shooter.jpg",
  breakout: "/assets/cover-breakout.jpg",
  pong: "/assets/cover-pong.jpg",
};

export function gameCover(slug: string, fallback?: string | null): string | null {
  return GAME_COVERS[slug] ?? fallback ?? null;
}
