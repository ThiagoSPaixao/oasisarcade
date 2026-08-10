import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const xpSchema = z.object({ amount: z.number().int().min(1).max(5000) });

const scoreSchema = z.object({
  slug: z.string().min(1).max(64),
  score: z.number().int().min(0).max(100_000_000),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  difficulty: z.string().max(32).optional(),
  gameVersion: z.string().max(32).optional(),
});


/** Grants XP server-side; the client never sends xp/level. */
export const grantXpSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => xpSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("grant_xp_for", {
      _user_id: context.userId,
      _amount: data.amount,
    });
    if (error) {
      console.error("[grant_xp]", error);
      throw new Error("Não foi possível conceder XP");
    }
    return row;
  });

/** Atomic personal record: the comparison happens in the database. */
export const submitScoreSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scoreSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isRecord, error } = await supabaseAdmin.rpc("submit_score_for", {
      _user_id: context.userId,
      _game_slug: data.slug,
      _score: data.score,
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
