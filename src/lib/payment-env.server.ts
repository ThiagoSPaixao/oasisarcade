import { getRequest } from "@tanstack/react-start/server";
import type { StripeEnv } from "@/lib/stripe.server";

/**
 * Ambiente de pagamento decidido NO SERVIDOR pelo host da requisição.
 * O cliente nunca escolhe: assim uma assinatura de teste (preview) nunca
 * libera o Premium no site publicado, e vice-versa.
 */
export function serverPaymentEnv(): StripeEnv {
  let host = "";
  try {
    host = new URL(getRequest().url).hostname.toLowerCase();
  } catch {
    host = "";
  }

  if (!host) return "sandbox";
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return "sandbox";
  // Preview da Lovable: id-preview--<id>.lovable.app e project--<id>-dev.lovable.app
  if (host.startsWith("id-preview--") || host.endsWith("-dev.lovable.app")) return "sandbox";
  if (host.endsWith(".vercel.app") && host.includes("-git-")) return "sandbox";
  return "live";
}
