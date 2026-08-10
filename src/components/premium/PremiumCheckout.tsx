import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createPremiumCheckoutSecure } from "@/lib/payments.functions";

/**
 * Formulário de pagamento embutido — os dados do cartão nunca passam pelo app.
 */
export function PremiumCheckout({ priceId, returnUrl }: { priceId: string; returnUrl: string }) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createPremiumCheckoutSecure({
      data: { priceId, returnUrl },
    });
    if ("error" in result) throw new Error(result.error);
    return result.clientSecret;
  };

  return (
    <div id="premium-checkout" className="border-foreground/10 bg-background mt-4 rounded-2xl border p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
