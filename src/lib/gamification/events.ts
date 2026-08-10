import { fetchGamificationStateSecure, processGameResultSecure } from "@/lib/gamification.functions";
import { EMPTY_STATE, type GameResultOutcome, type GamificationState } from "./types";

/**
 * Eventos observados pela camada de gamificação. Os jogos não conhecem
 * conquistas nem desafios: eles só terminam a partida e o evento é despachado.
 */
export type GamificationEvent =
  | { type: "game_over"; slug: string; sessionId: string; score: number; isRecord: boolean }
  | { type: "score_submitted"; slug: string; sessionId: string; score: number; isRecord: boolean };

export const GAMIFICATION_QUERY_KEY = ["gamification"] as const;

/** Despacha um evento de partida e devolve o resultado calculado pelo servidor. */
export async function dispatchGamificationEvent(
  event: GamificationEvent,
): Promise<GameResultOutcome | null> {
  const outcome = (await processGameResultSecure({
    data: {
      slug: event.slug,
      sessionId: event.sessionId,
      score: Math.max(0, Math.floor(event.score)),
      isRecord: event.isRecord,
    },
  })) as GameResultOutcome | null;
  if (!outcome) return null;
  return { ...outcome, unlocked: outcome.unlocked ?? [] };
}


export async function fetchGamificationState(): Promise<GamificationState> {
  const state = (await fetchGamificationStateSecure()) as GamificationState | null;
  if (!state) return EMPTY_STATE;
  return {
    ...EMPTY_STATE,
    ...state,
    stats: { ...EMPTY_STATE.stats, ...(state.stats ?? {}) },
    achievements: state.achievements ?? [],
  };
}
