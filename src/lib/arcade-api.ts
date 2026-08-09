import { supabase } from "@/integrations/supabase/client";
import { grantXpSecure, simulateSubscriptionSecure, submitScoreSecure } from "@/lib/player.functions";
import type { Game, Profile } from "@/types/arcade";

const GAME_FIELDS = "slug, name, description, category, is_premium, thumbnail, state, sort_order";

export async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select(GAME_FIELDS).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function fetchGame(slug: string): Promise<Game | null> {
  const { data, error } = await supabase.from("games").select(GAME_FIELDS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as Game) ?? null;
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

export type LeaderboardRow = {
  rank: number;
  username: string;
  level: number;
  score: number;
  created_at: string;
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

/** Saves the score only when it beats the stored record. The comparison happens in the database. */
export async function saveScoreIfRecord(
  slug: string,
  score: number,
  meta?: { durationMs?: number; difficulty?: string; gameVersion?: string },
): Promise<boolean> {
  if (!Number.isFinite(score) || score < 0) return false;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Não autenticado");
  const normalizedScore = Math.floor(score);
  const previousBest = await fetchBestScore(slug);
  const payload = {
    user_id: auth.user.id,
    game_slug: slug,
    score: normalizedScore,
    ...(meta?.durationMs !== undefined ? { duration_ms: Math.floor(meta.durationMs) } : {}),
    ...(meta?.difficulty !== undefined ? { difficulty: meta.difficulty } : {}),
    ...(meta?.gameVersion !== undefined ? { game_version: meta.gameVersion } : {}),
  };
  const { error } = await supabase.from("score_submissions").insert(payload);
  if (!error) return normalizedScore > previousBest;

  // Mantém compatibilidade com ambientes que ainda não receberam a fila segura.
  return (await submitScoreSecure({
    data: {
      slug,
      score: normalizedScore,
      ...(meta?.durationMs !== undefined ? { durationMs: Math.floor(meta.durationMs) } : {}),
      ...(meta?.difficulty !== undefined ? { difficulty: meta.difficulty } : {}),
      ...(meta?.gameVersion !== undefined ? { gameVersion: meta.gameVersion } : {}),
    },
  })) as boolean;
}

/** Requests XP; the server owns the accumulated XP and the level. */
export async function grantXp(amount: number): Promise<Profile | null> {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const safe = Math.min(5000, Math.floor(amount));
  const row = await grantXpSecure({ data: { amount: safe } });
  return (row as Profile) ?? null;
}

/** Development-only plan simulation, executed server-side. */
export async function simulateSubscription(plan: "free" | "premium"): Promise<Profile | null> {
  const row = await simulateSubscriptionSecure({ data: { plan } });
  return (row as Profile) ?? null;
}

/** Public leaderboard backed by the hosted database, independent of server deployment secrets. */
export async function fetchLeaderboard(slug: string, limit = 20): Promise<LeaderboardRow[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("user_id, username, level, score, scored_at")
    .eq("game_slug", slug)
    .order("score", { ascending: false })
    .order("scored_at", { ascending: true })
    .limit(safeLimit);
  if (error) throw error;
  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    user_id: row.user_id,
    username: row.username,
    level: row.level,
    score: row.score,
    created_at: row.scored_at,
  }));
}

