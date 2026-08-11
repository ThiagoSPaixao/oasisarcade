import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const slugSchema = z.object({ slug: z.string().min(1).max(64) });

/**
 * Estado da assinatura do jogador autenticado.
 * O cliente nunca informa o plano: ele apenas pergunta ao servidor.
 */
export const fetchSubscriptionStateSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    // RPC escopada em auth.uid(): não depende da chave de serviço do servidor.
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: unknown }>;
    const { data, error } = await rpc("my_subscription_state", {
      _environment: serverPaymentEnv(),
    });
    if (error) {
      console.error("[subscription_state]", error);
      throw new Error("Não foi possível carregar seu plano");
    }
    return data;
  });

/**
 * Autorização de entrada em um jogo, decidida pelo banco
 * (catálogo is_premium + assinatura válida).
 */
export const authorizeGameAccessSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => slugSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
    const { data: allowed, error } = await rpc("my_can_play_game", {
      _game_slug: data.slug,
      _environment: serverPaymentEnv(),
    });
    if (error) {
      console.error("[can_play_game]", error);
      throw new Error("Não foi possível verificar seu acesso");
    }
    return allowed === true;
  });
