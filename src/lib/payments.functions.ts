import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  priceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  returnUrl: z.string().url().max(500),
});

const portalSchema = z.object({
  returnUrl: z.string().url().max(500).optional(),
});

/** Cria a sessão de checkout da assinatura para o jogador autenticado. */
export const createPremiumCheckoutSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    const { getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const { serverPaymentEnv } = await import("@/lib/payment-env.server");
      const { createPremiumCheckout } = await import("@/lib/payments.server");
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const clientSecret = await createPremiumCheckout({
        env: serverPaymentEnv(),
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
      const { serverPaymentEnv } = await import("@/lib/payment-env.server");
      const env = serverPaymentEnv();

      const { data: row, error } = await context.supabase
        .from("subscriptions")
        .select("provider_customer_id")
        .eq("user_id", context.userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let customerId = row?.provider_customer_id ?? null;

      // Assinatura recém-criada pode ainda não ter chegado pelo webhook:
      // buscamos o cliente no provedor antes de dizer que não existe.
      if (error || !customerId) {
        const { readProviderSubscription } = await import("@/lib/payments.server");
        const {
          data: { user },
        } = await context.supabase.auth.getUser();
        const snapshot = await readProviderSubscription({
          env,
          userId: context.userId,
          ...(user?.email ? { email: user.email } : {}),
        });
        customerId = snapshot?.customerId ?? null;
      }

      if (!customerId) return { error: "Nenhuma assinatura encontrada para esta conta" };

      const { createPremiumPortal } = await import("@/lib/payments.server");
      const url = await createPremiumPortal({
        env,
        customerId,
        ...(data.returnUrl ? { returnUrl: data.returnUrl } : {}),
      });
      return { url };
    } catch (err) {
      console.error("[premium_portal]", err);
      return { error: getStripeErrorMessage(err) };
    }
  });

/**
 * Confere a assinatura direto no provedor e grava o resultado.
 * Usada após o checkout (não depende do webhook) e no botão de reconferência.
 */
export const syncPremiumSubscriptionSecure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isPremium: boolean } | { error: string }> => {
    const { getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const { serverPaymentEnv } = await import("@/lib/payment-env.server");
      const { readProviderSubscription, mapProviderStatus } = await import("@/lib/payments.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const env = serverPaymentEnv();
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const snapshot = await readProviderSubscription({
        env,
        userId: context.userId,
        ...(user?.email ? { email: user.email } : {}),
      });

      if (snapshot) {
        const { plan, status } = mapProviderStatus(snapshot.status);
        const { error } = await (supabaseAdmin.rpc as (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>)("apply_provider_subscription", {
          _user_id: context.userId,
          _plan: plan,
          _status: status,
          _provider: "stripe",
          _provider_customer_id: snapshot.customerId,
          _provider_subscription_id: snapshot.subscriptionId,
          _price_id: snapshot.priceId,
          _environment: env,
          _current_period_start: snapshot.periodStart,
          _current_period_end: snapshot.periodEnd,
          _cancel_at_period_end: snapshot.cancelAtPeriodEnd,
        });
        if (error) throw error;
      } else {
        await supabaseAdmin.rpc("refresh_plan_cache_for", { _user_id: context.userId });
      }

      const { data: state } = await supabaseAdmin.rpc("subscription_state_for", {
        _user_id: context.userId,
        _environment: env,
      });
      const isPremium =
        !!state && typeof state === "object" && (state as Record<string, unknown>)["isPremium"] === true;
      return { isPremium };
    } catch (error) {
      console.error("[premium_sync]", error);
      return { error: getStripeErrorMessage(error) };
    }
  });
