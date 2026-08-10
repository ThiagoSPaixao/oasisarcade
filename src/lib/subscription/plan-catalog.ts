/**
 * Fonte única do preço e do identificador do plano pago.
 * O valor cobrado de verdade vive no provedor de pagamento; o texto abaixo é
 * apenas apresentação. Para mudar o preço, atualize o provedor e este rótulo.
 */
export const PREMIUM_PRICE_ID = "oasis_premium_monthly";

export const PREMIUM_PLAN = {
  priceId: PREMIUM_PRICE_ID,
  name: "Oásis Premium",
  amountLabel: "R$ 14,90",
  intervalLabel: "por mês",
  fullLabel: "R$ 14,90/mês",
} as const;
