import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

type PlanId = "free" | "premium";
type MappedStatus = { plan: PlanId; status: string };

/**
 * Tradução dos estados do provedor para o modelo do Oásis Arcade.
 * O banco (subscription_state_for) decide o acesso final: cancelamento mantém
 * o Premium até o fim do período pago e cobrança pendente preserva o acesso.
 */
function mapStatus(providerStatus: string): MappedStatus {
  switch (providerStatus) {
    case "active":
    case "trialing":
      return { plan: "premium", status: "active" };
    case "past_due":
      return { plan: "premium", status: "past_due" };
    case "canceled":
    case "cancelled":
      return { plan: "premium", status: "cancelled" };
    case "unpaid":
    case "incomplete_expired":
      return { plan: "free", status: "expired" };
    default:
      return { plan: "free", status: "free" };
  }
}


function isoFromUnix(seconds: unknown): string | null {
  return typeof seconds === "number" && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

async function applySubscription(subscription: any, env: StripeEnv) {
  const userId: string | undefined = subscription?.metadata?.userId;
  if (!userId) {
    console.error("[payments_webhook] evento sem userId em metadata");
    return;
  }

  const item = subscription?.items?.data?.[0];
  const priceId: string | null =
    item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? item?.price?.id ?? null;
  const periodStart = item?.current_period_start ?? subscription?.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription?.current_period_end;
  const { plan, status } = mapStatus(String(subscription?.status ?? ""));

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any).rpc("apply_provider_subscription", {
    _user_id: userId,
    _plan: plan,
    _status: status,
    _provider: "stripe",
    _provider_customer_id:
      typeof subscription?.customer === "string" ? subscription.customer : (subscription?.customer?.id ?? null),
    _provider_subscription_id: subscription?.id ?? null,
    _price_id: priceId,
    _environment: env,
    _current_period_start: isoFromUnix(periodStart),
    _current_period_end: isoFromUnix(periodEnd),
    _cancel_at_period_end: subscription?.cancel_at_period_end === true,
  });
  if (error) {
    console.error("[payments_webhook] apply_provider_subscription", error);
    throw new Error("Falha ao aplicar assinatura");
  }
}

async function handleWebhook(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  const eventId = event.id ?? `${event.type}:${Date.now()}`;

  // Idempotência: o mesmo evento nunca é aplicado duas vezes.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: isNew, error: eventError } = await (supabaseAdmin as any).rpc("register_payment_event", {
    _event_id: eventId,
    _event_type: event.type,
    _environment: env,
    _user_id: event.data?.object?.metadata?.userId ?? null,
  });
  if (eventError) {
    console.error("[payments_webhook] register_payment_event", eventError);
    throw new Error("Falha ao registrar evento");
  }
  if (isNew !== true) return;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      // O estado da assinatura já chega pelos eventos customer.subscription.*.
      console.log("[payments_webhook] fatura processada:", event.type);
      break;
    case "checkout.session.completed":
      // Assinaturas são confirmadas por customer.subscription.created.
      console.log("[payments_webhook] checkout concluído");
      break;
    default:
      console.log("[payments_webhook] evento não tratado:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[payments_webhook] env inválido:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments_webhook] erro:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
