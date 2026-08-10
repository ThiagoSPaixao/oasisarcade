import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const resultSchema = z.object({
  slug: z.string().min(1).max(64),
  sessionId: z.string().uuid(),
  score: z.number().int().min(0).max(100_000_000),
  isRecord: z.boolean().optional(),
});

/**
 * Processa o fim de uma partida: XP da partida, streak, desafio diário e conquistas.
 * O banco valida a sessão da partida (tempo jogado e pontuação plausível) antes
 * de conceder qualquer recompensa.
 */
export const processGameResultSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resultSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    const { data: row, error } = await supabaseAdmin.rpc("process_game_result_for", {
      _user_id: context.userId,
      _environment: serverPaymentEnv(),
      _game_slug: data.slug,
      _score: data.score,
      _session_id: data.sessionId,
      _is_record: data.isRecord ?? false,
    });
    if (error) {
      console.error("[process_game_result]", error);
      throw new Error("Não foi possível registrar sua partida");
    }
    return row;
  });

/** Estado de progressão (nível, XP, streak, conquistas, desafio) em uma única consulta. */
export const fetchGamificationStateSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("get_gamification_state_for", {
      _user_id: context.userId,
    });
    if (error) {
      console.error("[get_gamification_state]", error);
      throw new Error("Não foi possível carregar sua progressão");
    }
    return row;
  });
