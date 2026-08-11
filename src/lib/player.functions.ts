import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sessionStartSchema = z.object({ slug: z.string().min(1).max(64) });

const scoreSchema = z.object({
  slug: z.string().min(1).max(64),
  sessionId: z.string().uuid(),
  score: z.number().int().min(0).max(100_000_000),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  difficulty: z.string().max(32).optional(),
  gameVersion: z.string().max(32).optional(),
});

/**
 * Abre uma sessão de partida no servidor. A sessão é a prova de que o jogo
 * foi realmente aberto: sem ela nenhuma pontuação ou XP é aceito.
 */
export const startGameSessionSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sessionStartSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    // RPC escopada em auth.uid(): funciona em qualquer hospedagem, mesmo sem chave de serviço.
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
    const { data: sessionId, error } = await rpc("my_start_game_session", {
      _environment: serverPaymentEnv(),
      _game_slug: data.slug,
    });
    if (error) {
      console.error("[start_game_session]", error);
      throw new Error("Não foi possível iniciar a partida");
    }
    return sessionId as string;
  });

/** Atomic personal record: the comparison and the session check happen in the database. */
export const submitScoreSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scoreSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { serverPaymentEnv } = await import("@/lib/payment-env.server");
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
    const { data: isRecord, error } = await rpc("my_submit_score", {
      _environment: serverPaymentEnv(),
      _game_slug: data.slug,
      _score: data.score,
      _session_id: data.sessionId,
      ...(data.durationMs === undefined ? {} : { _duration_ms: data.durationMs }),
      ...(data.difficulty === undefined ? {} : { _difficulty: data.difficulty }),
      ...(data.gameVersion === undefined ? {} : { _game_version: data.gameVersion }),
    });
    if (error) {
      console.error("[submit_score]", error);
      throw new Error("Não foi possível salvar a pontuação");
    }
    return isRecord === true;
  });
