import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z.object({ slug: z.string().min(1).max(64) });

/**
 * Estado da assinatura do jogador autenticado.
 * O cliente nunca informa o plano: ele apenas pergunta ao servidor.
 */
export const fetchSubscriptionStateSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    const { data, error } = await supabaseAdmin.rpc("subscription_state_for", {
      _user_id: context.userId,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    const { data: allowed, error } = await supabaseAdmin.rpc("can_play_game_for", {
      _user_id: context.userId,
      _game_slug: data.slug,
      _environment: serverPaymentEnv(),
    });
    if (error) {
      console.error("[can_play_game]", error);
      throw new Error("Não foi possível verificar seu acesso");
    }
    return allowed === true;
  });
