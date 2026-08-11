import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

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
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: Json | null; error: unknown }>;
    const { data: row, error } = await rpc("my_process_game_result", {
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
    // RPC escopada em auth.uid(): não depende da chave de serviço do servidor.
    const { data: row, error } = await (
      context.supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: Json | null; error: unknown }>
    )("my_gamification_state");
    if (error) {
      console.error("[get_gamification_state]", error);
      throw new Error("Não foi possível carregar sua progressão");
    }
    return row ?? null;
  });
