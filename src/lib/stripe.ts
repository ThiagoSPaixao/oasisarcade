import { loadStripe, type Stripe } from "@stripe/stripe-js";

/** Espelho local do tipo do servidor — mantém este módulo livre de imports server-only. */
type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/**
 * O ambiente vem do PREFIXO do token. Token ausente ou desconhecido é erro de
 * configuração — nunca cai para "live" silenciosamente.
 */
function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Os pagamentos ainda não estão configurados para esta versão do app. Conclua a ativação de pagamentos ao vivo para liberar o checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

/** Checkout disponível nesta build? Usado para não mostrar botão quebrado. */
export function isPaymentsConfigured(): boolean {
  return !!clientToken && (clientToken.startsWith("pk_test_") || clientToken.startsWith("pk_live_"));
}
