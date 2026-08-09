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
  user_id: string;
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
  const payload = {
    slug,
    score: Math.floor(score),
    ...(meta?.durationMs !== undefined ? { durationMs: Math.floor(meta.durationMs) } : {}),
    ...(meta?.difficulty !== undefined ? { difficulty: meta.difficulty } : {}),
    ...(meta?.gameVersion !== undefined ? { gameVersion: meta.gameVersion } : {}),
  };
  // Public Data API first (works on any host); server function as fallback.
  const { data, error } = await supabase.rpc("submit_score", {
    _game_slug: slug,
    _score: payload.score,
    ...(payload.durationMs === undefined ? {} : { _duration_ms: payload.durationMs }),
    ...(payload.difficulty === undefined ? {} : { _difficulty: payload.difficulty }),
    ...(payload.gameVersion === undefined ? {} : { _game_version: payload.gameVersion }),
  });
  if (!error) return data === true;
  console.warn("[score] RPC falhou, usando função de servidor", error);
  return (await submitScoreSecure({ data: payload })) as boolean;
}

/** Requests XP; the server owns the accumulated XP and the level. */
export async function grantXp(amount: number): Promise<Profile | null> {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const safe = Math.min(5000, Math.floor(amount));
  const { data, error } = await supabase.rpc("grant_xp", { _amount: safe });
  if (!error) return (data as unknown as Profile) ?? null;
  console.warn("[xp] RPC falhou, usando função de servidor", error);
  const row = await grantXpSecure({ data: { amount: safe } });
  return (row as Profile) ?? null;
}

/** Development-only plan simulation, executed server-side. */
export async function simulateSubscription(plan: "free" | "premium"): Promise<Profile | null> {
  const { data, error } = await supabase.rpc("simulate_subscription", { _plan: plan });
  if (!error) return (data as unknown as Profile) ?? null;
  console.warn("[plan] RPC falhou, usando função de servidor", error);
  const row = await simulateSubscriptionSecure({ data: { plan } });
  return (row as Profile) ?? null;
}


/**
 * Global leaderboard read directly through the public Data API (publishable key),
 * so it works on any host without server-only service keys.
 */
export async function fetchLeaderboard(slug: string, limit = 20): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { _game_slug: slug, _limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
