/**
 * Modelo de planos e autorização de acesso — espelho do banco
 * (public.subscription_state_for / public.can_play_game_for).
 *
 * FONTE DA VERDADE: a tabela subscriptions no servidor.
 * profiles.plano_status é apenas um cache derivado, mantido por funções
 * do banco. Nada aqui autoriza nada: este módulo só descreve o que a
 * interface deve mostrar. Toda operação sensível é revalidada no servidor.
 */

export type PlanId = "free" | "premium";

/** Estados normalizados da assinatura. Novos planos entram sem reescrita. */
export type SubscriptionStatus = "free" | "active" | "past_due" | "expired" | "cancelled";


export type SubscriptionState = {
  plan: PlanId;
  status: SubscriptionStatus;
  isPremium: boolean;
  currentPeriodEnd: string | null;
};

export const FREE_SUBSCRIPTION: SubscriptionState = {
  plan: "free",
  status: "free",
  isPremium: false,
  currentPeriodEnd: null,
};

const STATUSES: SubscriptionStatus[] = ["free", "active", "past_due", "expired", "cancelled"];

/** Normaliza o payload do servidor (nunca confia em formato). */
export function toSubscriptionState(raw: unknown): SubscriptionState {
  if (!raw || typeof raw !== "object") return FREE_SUBSCRIPTION;
  const row = raw as Record<string, unknown>;
  const plan: PlanId = row["plan"] === "premium" ? "premium" : "free";
  const status = STATUSES.includes(row["status"] as SubscriptionStatus)
    ? (row["status"] as SubscriptionStatus)
    : "free";
  return {
    plan,
    status,
    isPremium: row["isPremium"] === true && plan === "premium" && status === "active",
    currentPeriodEnd: typeof row["currentPeriodEnd"] === "string" ? row["currentPeriodEnd"] : null,
  };
}

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Plano gratuito",
  premium: "Oásis Premium",
};

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  free: "Gratuito",
  active: "Ativo",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export type GameAccessReason = "ok" | "premium_required" | "coming_soon" | "unknown_game";

export type GameAccess = { allowed: boolean; reason: GameAccessReason };

type AccessGame = { is_premium: boolean; status?: "available" | "coming_soon" } | null | undefined;

/**
 * Regra única de acesso a um jogo: catálogo (is_premium) + assinatura.
 * Usada apenas para decidir o que renderizar — o servidor recusa
 * pontuação/XP de jogo Premium sem acesso legítimo.
 */
export function canPlayGame(subscription: SubscriptionState | undefined, game: AccessGame): GameAccess {
  if (!game) return { allowed: false, reason: "unknown_game" };
  if (game.status === "coming_soon") return { allowed: false, reason: "coming_soon" };
  if (!game.is_premium) return { allowed: true, reason: "ok" };
  if (subscription?.isPremium) return { allowed: true, reason: "ok" };
  return { allowed: false, reason: "premium_required" };
}

/** Conveniência para badges e cadeados no catálogo. */
export function isGameLocked(subscription: SubscriptionState | undefined, game: AccessGame): boolean {
  return !!game?.is_premium && !subscription?.isPremium;
}
