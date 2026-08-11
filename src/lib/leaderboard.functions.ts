import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  slug: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(100).optional(),
});

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Usa a sessão do jogador (RLS/RPC), assim o ranking funciona em qualquer
    // hospedagem, mesmo sem a chave de serviço configurada.
    const { data: rows, error } = await context.supabase.rpc("get_leaderboard", {
      _game_slug: data.slug,
      _limit: data.limit ?? 20,
    });
    if (error) {
      console.error("[leaderboard]", error);
      throw new Error("Não foi possível carregar o ranking");
    }
    return rows ?? [];
  });
