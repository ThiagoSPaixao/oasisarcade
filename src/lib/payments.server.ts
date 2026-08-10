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
