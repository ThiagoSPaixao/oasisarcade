import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planSchema = z.object({ plan: z.enum(["free", "premium"]) });
const slugSchema = z.object({ slug: z.string().min(1).max(64) });

/**
 * Estado da assinatura do jogador autenticado.
 * O cliente nunca informa o plano: ele apenas pergunta ao servidor.
 */
export const fetchSubscriptionStateSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("subscription_state_for", {
      _user_id: context.userId,
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
    const { data: allowed, error } = await supabaseAdmin.rpc("can_play_game_for", {
      _user_id: context.userId,
      _game_slug: data.slug,
    });
    if (error) {
      console.error("[can_play_game]", error);
      throw new Error("Não foi possível verificar seu acesso");
    }
    return allowed === true;
  });

/**
 * FERRAMENTA DE DESENVOLVIMENTO/TESTE — não é um fluxo de compra.
 * Só responde quando o ambiente habilita explicitamente
 * (ARCADE_DEV_PLAN_TOOLS=true ou NODE_ENV diferente de production).
 * Nenhuma tela de produção depende desta função.
 */
export const devSetPlanSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data, context }) => {
    const enabled =
      process.env["ARCADE_DEV_PLAN_TOOLS"] === "true" || process.env["NODE_ENV"] !== "production";
    if (!enabled) throw new Error("Ferramenta de teste desabilitada neste ambiente");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("simulate_subscription_for", {
      _user_id: context.userId,
      _plan: data.plan,
    });
    if (error) {
      console.error("[dev_set_plan]", error);
      throw new Error("Não foi possível alterar o plano de teste");
    }
    const { data: state, error: stateError } = await supabaseAdmin.rpc("subscription_state_for", {
      _user_id: context.userId,
    });
    if (stateError) throw new Error("Não foi possível carregar seu plano");
    return state;
  });
