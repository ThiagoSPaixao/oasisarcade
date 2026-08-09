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
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_leaderboard", {
      _game_slug: data.slug,
      _limit: data.limit ?? 20,
    });
    if (error) {
      console.error("[leaderboard]", error);
      throw new Error("Não foi possível carregar o ranking");
    }
    return rows ?? [];
  });
