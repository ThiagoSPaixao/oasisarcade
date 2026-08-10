import type Stripe from "stripe";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

/**
 * Resolve (ou cria) o cliente no provedor sempre carregando o userId em
 * metadata — é o que torna as leituras futuras (portal, faturas) confiáveis.
 */
export async function resolveOrCreateCustomer(
  stripe: Stripe,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length && found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/** Sessão de checkout embutida da assinatura Premium. */
export async function createPremiumCheckout(params: {
  env: StripeEnv;
  priceId: string;
  userId: string;
  email?: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = createStripeClient(params.env);

  const prices = await stripe.prices.list({ lookup_keys: [params.priceId] });
  const stripePrice = prices.data[0];
  if (!stripePrice) throw new Error("Plano não encontrado no provedor de pagamento");

  const customerId = await resolveOrCreateCustomer(stripe, {
    userId: params.userId,
    ...(params.email ? { email: params.email } : {}),
  });

  const isRecurring = stripePrice.type === "recurring";

  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: stripePrice.id, quantity: 1 }],
    mode: isRecurring ? "subscription" : "payment",
    ui_mode: "embedded_page",
    return_url: params.returnUrl,
    customer: customerId,
    // Vendedor no Brasil: o provedor calcula e cobra o imposto; a apuração e o
    // recolhimento seguem sendo responsabilidade do vendedor.
    automatic_tax: { enabled: true },
    metadata: { userId: params.userId, managed_payments: "false" },
    ...(isRecurring && { subscription_data: { metadata: { userId: params.userId } } }),
  });

  return session.client_secret ?? "";
}

/** Portal de gerenciamento (cancelar, trocar cartão, faturas). */
export async function createPremiumPortal(params: {
  env: StripeEnv;
  customerId: string;
  returnUrl?: string;
}): Promise<string> {
  const stripe = createStripeClient(params.env);
  const portal = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    ...(params.returnUrl && { return_url: params.returnUrl }),
  });
  return portal.url;
}

type ProviderSubscriptionSnapshot = {
  status: string;
  priceId: string | null;
  customerId: string | null;
  subscriptionId: string;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

function isoFromUnix(seconds: unknown): string | null {
  return typeof seconds === "number" && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Lê a assinatura mais recente do jogador direto no provedor.
 * É a rede de segurança para quando o webhook atrasa ou falha: o app
 * confere a verdade na fonte em vez de esperar um evento.
 */
export async function readProviderSubscription(params: {
  env: StripeEnv;
  userId: string;
  email?: string;
}): Promise<ProviderSubscriptionSnapshot | null> {
  const stripe = createStripeClient(params.env);
  const customerId = await resolveOrCreateCustomer(stripe, {
    userId: params.userId,
    ...(params.email ? { email: params.email } : {}),
  });

  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  if (!list.data.length) return null;

  const rank = (status: string): number =>
    status === "active" || status === "trialing" ? 0 : status === "past_due" ? 1 : 2;
  const sorted = [...list.data].sort((a, b) => rank(a.status) - rank(b.status) || b.created - a.created);
  const sub = sorted[0];
  if (!sub) return null;

  const item = sub.items?.data?.[0];
  const price = item?.price;

  return {
    status: String(sub.status),
    priceId: price?.lookup_key ?? price?.metadata?.["lovable_external_id"] ?? price?.id ?? null,
    customerId,
    subscriptionId: sub.id,
    periodStart: isoFromUnix(item?.current_period_start ?? (sub as unknown as { current_period_start?: number }).current_period_start),
    periodEnd: isoFromUnix(item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
  };
}

/** Cancela no fim do período todas as assinaturas ativas do jogador (usado na exclusão de conta). */
export async function cancelProviderSubscriptions(params: {
  env: StripeEnv;
  userId: string;
  email?: string;
}): Promise<number> {
  const stripe = createStripeClient(params.env);
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${params.userId}'`,
    limit: 3,
  });
  let cancelled = 0;
  for (const customer of found.data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 20 });
    for (const sub of subs.data) {
      if (sub.status === "canceled" || sub.status === "incomplete_expired") continue;
      await stripe.subscriptions.cancel(sub.id);
      cancelled += 1;
    }
  }
  return cancelled;
}
