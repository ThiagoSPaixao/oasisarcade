import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const environmentSchema = z.enum(["sandbox", "live"]);

const checkoutSchema = z.object({
  priceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  returnUrl: z.string().url().max(500),
  environment: environmentSchema,
});

const portalSchema = z.object({
  returnUrl: z.string().url().max(500).optional(),
  environment: environmentSchema,
});

/** Cria a sessão de checkout da assinatura para o jogador autenticado. */
export const createPremiumCheckoutSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const { createPremiumCheckout } = await import("@/lib/payments.server");
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const clientSecret = await createPremiumCheckout({
        env: data.environment,
        priceId: data.priceId,
        userId: context.userId,
        returnUrl: data.returnUrl,
        ...(user?.email ? { email: user.email } : {}),
      });
      if (!clientSecret) return { error: "O provedor de pagamento não devolveu uma sessão válida" };
      return { clientSecret };
    } catch (error) {
      console.error("[premium_checkout]", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Abre o portal de gerenciamento da assinatura do jogador autenticado. */
export const createPremiumPortalSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => portalSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const { data: row, error } = await context.supabase
        .from("subscriptions")
        .select("provider_customer_id")
        .eq("user_id", context.userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !row?.provider_customer_id) {
        return { error: "Nenhuma assinatura encontrada para esta conta" };
      }

      const { createPremiumPortal } = await import("@/lib/payments.server");
      const url = await createPremiumPortal({
        env: data.environment,
        customerId: row.provider_customer_id,
        ...(data.returnUrl ? { returnUrl: data.returnUrl } : {}),
      });
      return { url };
    } catch (err) {
      console.error("[premium_portal]", err);
      return { error: getStripeErrorMessage(err) };
    }
  });
