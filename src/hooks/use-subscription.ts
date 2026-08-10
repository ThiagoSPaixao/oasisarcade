import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchSubscriptionStateSecure } from "@/lib/subscription.functions";
import {
  canPlayGame,
  FREE_SUBSCRIPTION,
  toSubscriptionState,
  type GameAccess,
  type SubscriptionState,
} from "@/lib/subscription/access";

export const SUBSCRIPTION_QUERY_KEY = ["subscription"] as const;

/**
 * Estado de assinatura compartilhado por todo o app (uma consulta, um cache).
 * A query é invalidada no login/logout junto com o resto do cache
 * (queryClient.clear() no sign-out), então o plano nunca fica preso.
 */
export function useSubscription() {
  const query = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: async (): Promise<SubscriptionState> =>
      toSubscriptionState(await fetchSubscriptionStateSecure()),
    staleTime: 60_000,
  });

  const subscription = query.data ?? FREE_SUBSCRIPTION;

  return {
    subscription,
    isPremium: subscription.isPremium,
    isLoading: query.isLoading,
    isError: query.isError,
    /** Reavalia o acesso a um jogo com a assinatura atual. */
    access: (game: Parameters<typeof canPlayGame>[1]): GameAccess => canPlayGame(query.data, game),
  };
}

/** Refresca o plano após mudanças de sessão ou de assinatura. */
export function useRefreshSubscription() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY }),
    [queryClient],
  );
}
