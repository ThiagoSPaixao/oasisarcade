/**
 * Fonte única dos preços e identificadores do plano pago.
 * O valor cobrado de verdade vive no provedor de pagamento; os textos abaixo
 * são apenas apresentação. Para mudar o preço, atualize o provedor e o rótulo.
 */
export type PremiumInterval = "monthly" | "yearly";

export type PremiumPriceOption = {
  interval: PremiumInterval;
  priceId: string;
  label: string;
  amountLabel: string;
  intervalLabel: string;
  fullLabel: string;
  note?: string;
};

export const PREMIUM_PRICES: Record<PremiumInterval, PremiumPriceOption> = {
  monthly: {
    interval: "monthly",
    priceId: "oasis_premium_monthly",
    label: "Mensal",
    amountLabel: "R$ 14,90",
    intervalLabel: "por mês",
    fullLabel: "R$ 14,90/mês",
  },
  yearly: {
    interval: "yearly",
    priceId: "oasis_premium_yearly",
    label: "Anual",
    amountLabel: "R$ 149,00",
    intervalLabel: "por ano",
    fullLabel: "R$ 149,00/ano",
    note: "Equivale a R$ 12,42/mês — 2 meses grátis.",
  },
};

export const PREMIUM_PRICE_LIST: PremiumPriceOption[] = [PREMIUM_PRICES.monthly, PREMIUM_PRICES.yearly];

/** Compatibilidade: plano mensal como padrão. */
export const PREMIUM_PRICE_ID = PREMIUM_PRICES.monthly.priceId;

export const PREMIUM_PLAN = {
  priceId: PREMIUM_PRICES.monthly.priceId,
  name: "Oásis Premium",
  amountLabel: PREMIUM_PRICES.monthly.amountLabel,
  intervalLabel: PREMIUM_PRICES.monthly.intervalLabel,
  fullLabel: PREMIUM_PRICES.monthly.fullLabel,
} as const;
