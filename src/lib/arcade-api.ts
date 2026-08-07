import { supabase } from "@/integrations/supabase/client";
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

export async function fetchLeaderboard(slug: string, limit = 20): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { _game_slug: slug, _limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}


export async function fetchBestScore(slug: string): Promise<number> {
  const { data, error } = await supabase
    .from("user_scores")
    .select("score")
    .eq("game_slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data?.score ?? 0;
}

/** Saves the score only when it beats the stored record. Returns true when a new record was set. */
export async function saveScoreIfRecord(slug: string, score: number): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false;
  const best = await fetchBestScore(slug);
  if (score <= best) return false;
  const { error } = await supabase
    .from("user_scores")
    .upsert({ user_id: userId, game_slug: slug, score }, { onConflict: "user_id,game_slug" });
  if (error) throw error;
  return true;
}

export async function grantXp(amount: number): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId || amount <= 0) return null;
  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("xp")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;
  const xp = (current?.xp ?? 0) + amount;
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const { data, error } = await supabase
    .from("profiles")
    .update({ xp, level })
    .eq("id", userId)
    .select("id, username, avatar_url, level, xp, plano_status")
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function simulateSubscription(plan: "free" | "premium"): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Não autenticado");

  const periodEnd = plan === "premium" ? new Date(Date.now() + 30 * 864e5).toISOString() : null;
  const { error: subError } = await supabase.from("subscriptions").upsert(
    { user_id: userId, plan, status: "active", current_period_end: periodEnd },
    { onConflict: "user_id" },
  );
  if (subError) throw subError;

  const { data, error } = await supabase
    .from("profiles")
    .update({ plano_status: plan })
    .eq("id", userId)
    .select("id, username, avatar_url, level, xp, plano_status")
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}
