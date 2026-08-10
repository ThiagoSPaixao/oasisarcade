import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const deleteSchema = z.object({
  /** Confirmação digitada pelo jogador, evita exclusão acidental. */
  confirm: z.literal("EXCLUIR"),
});

/**
 * Exclui a conta do jogador: cancela a assinatura no provedor (para não
 * gerar cobranças órfãs) e remove o usuário e todos os dados vinculados.
 */
export const deleteAccountSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { cancelProviderSubscriptions } = await import("@/lib/payments.server");
      const { serverPaymentEnv } = await import("@/lib/payment-env.server");
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      try {
        await cancelProviderSubscriptions({
          env: serverPaymentEnv(),
          userId: context.userId,
          ...(user?.email ? { email: user.email } : {}),
        });
      } catch (err) {
        // Falha no provedor não deve impedir a exclusão da conta.
        console.error("[delete_account_cancel]", err);
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
      if (error) throw error;
      return { ok: true };
    } catch (error) {
      console.error("[delete_account]", error);
      return { error: "Não foi possível excluir sua conta agora. Tente novamente em instantes." };
    }
  });
