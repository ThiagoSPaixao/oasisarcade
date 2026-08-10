import { supabase } from "@/integrations/supabase/client";
import { startGameSessionSecure, submitScoreSecure } from "@/lib/player.functions";
import { getLeaderboard } from "@/lib/leaderboard.functions";
import { mergeCatalog, toCatalogGame, type CatalogGame } from "@/lib/games/catalog";
import type { Game } from "@/types/arcade";


const GAME_FIELDS = "slug, name, description, category, is_premium, thumbnail, state, sort_order";

/** Catálogo = metadados do banco + definição técnica do Game Registry. */
export async function fetchGames(): Promise<CatalogGame[]> {
  const { data, error } = await supabase.from("games").select(GAME_FIELDS).order("sort_order");
  if (error) throw error;
  return mergeCatalog((data ?? []) as Game[]);
}

export async function fetchGame(slug: string): Promise<CatalogGame | null> {
  const { data, error } = await supabase.from("games").select(GAME_FIELDS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toCatalogGame(data as Game);
}


export async function fetchFavorites(): Promise<string[]> {
  const { data, error } = await supabase.from("favorites").select("game_slug");
  if (error) throw error;
  return (data ?? []).map((row) => row.game_slug);
}

export async function toggleFavorite(slug: string, isFavorite: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Não autenticado");
  if (isFavorite) {
    const { error } = await supabase.from("favorites").delete().eq("game_slug", slug).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("favorites").insert({ game_slug: slug, user_id: userId });
  if (error) throw error;
}

export async function fetchScores(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("user_scores").select("game_slug, score");
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) map[row.game_slug] = row.score;
  return map;
}

/** Última partida registrada por jogo (base da vitrine "Jogar novamente"). */
export async function fetchLastPlayed(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("user_scores").select("game_slug, played_at");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) if (row.played_at) map[row.game_slug] = row.played_at;
  return map;
}

export type LeaderboardRow = {
  rank: number;
  username: string;
  level: number;
  score: number;
  created_at: string;
  isPremium: boolean;
};



// O ranking global é lido por uma função de servidor (src/lib/leaderboard.functions.ts),
// pois a função do banco não é mais executável diretamente pelo cliente.



export async function fetchBestScore(slug: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_scores")
    .select("score")
    .eq("game_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data?.score ?? 0;
}

/** Abre a sessão da partida no servidor: prova de que o jogo foi realmente jogado. */
export async function startGameSession(slug: string): Promise<string | null> {
  try {
    return (await startGameSessionSecure({ data: { slug } })) as string;
  } catch {
    return null;
  }
}

/** Saves the score only when it beats the stored record. The comparison happens in the database. */
export async function saveScoreIfRecord(
  slug: string,
  score: number,
  sessionId: string,
  meta?: { durationMs?: number; difficulty?: string; gameVersion?: string },
): Promise<boolean> {
  if (!Number.isFinite(score) || score < 0) return false;
  const normalizedScore = Math.floor(score);
  return (await submitScoreSecure({
    data: {
      slug,
      sessionId,
      score: normalizedScore,
      ...(meta?.durationMs !== undefined ? { durationMs: Math.floor(meta.durationMs) } : {}),
      ...(meta?.difficulty !== undefined ? { difficulty: meta.difficulty } : {}),
      ...(meta?.gameVersion !== undefined ? { gameVersion: meta.gameVersion } : {}),
    },
  })) as boolean;
}

/** Public leaderboard read through a server function (no internal user ids exposed). */
export async function fetchLeaderboard(slug: string, limit = 20): Promise<LeaderboardRow[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = (await getLeaderboard({ data: { slug, limit: safeLimit } })) as Array<{
    rank: number | null;
    username: string | null;
    level: number | null;
    score: number | null;
    created_at: string | null;
    is_premium: boolean | null;
  }>;
  return (rows ?? []).map((row, index) => ({
    rank: row.rank ?? index + 1,
    username: row.username ?? "Player",
    level: row.level ?? 1,
    score: row.score ?? 0,
    created_at: row.created_at ?? new Date(0).toISOString(),
    isPremium: row.is_premium === true,
  }));
}



