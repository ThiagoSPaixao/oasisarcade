import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Crown, Gamepad2, Sparkles, Trophy } from "lucide-react";

import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { MobileNav } from "@/components/arcade/MobileNav";
import { PaymentTestModeBanner } from "@/components/premium/PaymentTestModeBanner";
import { PremiumCheckout } from "@/components/premium/PremiumCheckout";
import { useRefreshSubscription, useSubscription } from "@/hooks/use-subscription";
import { createPremiumPortalSecure, syncPremiumSubscriptionSecure } from "@/lib/payments.functions";
import { PREMIUM_PRICE_LIST, type PremiumInterval } from "@/lib/subscription/plan-catalog";
import { STATUS_LABEL } from "@/lib/subscription/access";
import { isPaymentsConfigured } from "@/lib/stripe";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPage,
  validateSearch: (search: Record<string, unknown>): { checkout?: "success" | undefined } => ({
    checkout: search["checkout"] === "success" ? "success" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Oásis Premium · Jogos e recursos exclusivos" },
      {
        name: "description",
        content:
          "Assine o Oásis Premium por R$ 14,90/mês e libere os jogos Premium, XP em dobro e recursos exclusivos do Oásis Arcade.",
      },
      { property: "og:title", content: "Oásis Premium · Jogos e recursos exclusivos" },
      {
        property: "og:description",
        content: "Assinatura mensal do Oásis Arcade: jogos Premium e recursos exclusivos por R$ 14,90/mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const BENEFITS = [
  {
    icon: Gamepad2,
    title: "Jogos Premium",
    text: "Acesso a todos os jogos do catálogo marcados como Premium, agora e nos próximos lançamentos.",
  },
  {
    icon: Trophy,
    title: "XP em dobro",
    text: "Toda partida rende o dobro de XP, acelerando seu nível e suas conquistas.",
  },
  {
    icon: Sparkles,
    title: "Novidades primeiro",
    text: "Novos recursos do arcade chegam antes para quem é Premium.",
  },
];

function PremiumPage() {
  const { checkout } = Route.useSearch();
  const { subscription, isPremium } = useSubscription();
  const refresh = useRefreshSubscription();
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const [showCheckout, setShowCheckout] = useState(false);
  const [interval, setInterval_] = useState<PremiumInterval>("monthly");
  const [portalPending, setPortalPending] = useState(false);
  const configured = isPaymentsConfigured();
  const selected = PREMIUM_PRICE_LIST.find((p) => p.interval === interval) ?? PREMIUM_PRICE_LIST[0]!;
  const pastDue = subscription.status === "past_due";
  const cancelled = subscription.status === "cancelled";
  const periodEndLabel = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
    : null;

  // Após o pagamento, a ativação chega pelo provedor (servidor). Reconsultamos
  // o plano algumas vezes até o servidor confirmar.
  useEffect(() => {
    if (checkout !== "success") return;
    setShowCheckout(false);
    toast.success("Pagamento recebido! Ativando seu Premium...");
    // Não dependemos do webhook: conferimos a assinatura direto no provedor.
    let tries = 0;
    const tick = async () => {
      tries += 1;
      await syncPremiumSubscriptionSecure({}).catch(() => undefined);
      await refresh();
      void loadProfile();
      if (tries >= 6) clearInterval(timer);
    };
    void tick();
    const timer = setInterval(() => void tick(), 2500);
    return () => clearInterval(timer);
  }, [checkout, refresh, loadProfile]);

  const openPortal = async () => {
    setPortalPending(true);
    try {
      const result = await createPremiumPortalSecure({
        data: { returnUrl: `${window.location.origin}/premium` },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o gerenciamento.");
    } finally {
      setPortalPending(false);
    }
  };

  return (
    <ArcadeShell className="px-4 py-5 pb-28 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Voltar ao dashboard"
            className="border-foreground/15 text-muted-foreground hover:text-primary hover:border-primary/40 focus-visible:ring-accent/60 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.3} />
          </Link>
          <h1 className="glow-magenta text-primary text-lg font-bold tracking-tight">👑 OÁSIS PREMIUM</h1>
        </div>

        <PaymentTestModeBanner />

        <section className="glass mt-3 px-4 py-5 sm:px-5">
          <p className="ui-label text-neon-yellow text-[10px]">SEU PLANO ATUAL</p>
          <p className="text-foreground mt-1 text-base font-semibold">
            {isPremium
              ? subscription.isComped
                ? "👑 Oásis Premium · Cortesia"
                : `👑 Oásis Premium${subscription.interval === "yearly" ? " · Anual" : subscription.interval === "monthly" ? " · Mensal" : ""}`
              : "Plano gratuito"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            {isPremium
              ? subscription.isComped
                ? "Acesso vitalício concedido pela equipe do Oásis Arcade — sem cobranças."
                : `Status: ${STATUS_LABEL[subscription.status]}${
                    periodEndLabel
                      ? `${cancelled || subscription.cancelAtPeriodEnd ? " · acesso até " : " · renova em "}${periodEndLabel}`
                      : ""
                  }`
              : "Você tem acesso a todos os jogos gratuitos, recordes, ranking, XP e conquistas."}
          </p>


          {pastDue ? (
            <p
              role="status"
              className="border-neon-yellow/50 bg-neon-yellow/10 text-neon-yellow mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] leading-relaxed"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden="true" />
              <span>
                Não conseguimos confirmar sua última cobrança. Seu acesso Premium segue ativo enquanto
                tentamos novamente — atualize o cartão em “Gerenciar assinatura” para não perder o acesso.
              </span>
            </p>
          ) : null}

          {cancelled ? (
            <p
              role="status"
              className="border-foreground/15 text-muted-foreground mt-3 rounded-xl border px-3 py-2.5 text-[12px] leading-relaxed"
            >
              Assinatura cancelada. Você continua com o Premium
              {periodEndLabel ? ` até ${periodEndLabel}` : " até o fim do período já pago"} e depois volta ao
              plano gratuito automaticamente.
            </p>
          ) : null}

          {isPremium ? (
            <button
              type="button"
              disabled={portalPending}
              onClick={() => void openPortal()}
              className="border-neon-yellow/50 text-neon-yellow focus-visible:ring-accent/60 mt-4 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-[12px] font-bold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
            >
              {portalPending ? "ABRINDO..." : "GERENCIAR ASSINATURA"}
            </button>
          ) : null}
        </section>

        <h2 className="ui-label text-accent mt-8 text-xs">O QUE O PREMIUM LIBERA</h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="border-foreground/10 bg-surface-2/40 rounded-2xl border px-4 py-4">
              <span className="border-accent/40 text-accent grid h-10 w-10 place-items-center rounded-full border">
                <Icon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
              </span>
              <p className="text-foreground mt-2.5 text-sm font-semibold">{title}</p>
              <p className="text-muted-foreground mt-0.5 text-[12px] leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>

        {!isPremium ? (
          <section className="border-primary/30 bg-primary/5 mt-8 rounded-2xl border px-4 py-5 text-center">
            <p className="ui-label text-primary flex items-center justify-center gap-2 text-[10px]">
              <Crown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" /> ESCOLHA SEU PLANO
            </p>

            <div
              role="radiogroup"
              aria-label="Periodicidade da assinatura"
              className="mt-3 grid gap-2 sm:grid-cols-2"
            >
              {PREMIUM_PRICE_LIST.map((option) => (
                <button
                  key={option.priceId}
                  type="button"
                  role="radio"
                  aria-checked={option.interval === interval}
                  onClick={() => {
                    setInterval_(option.interval);
                    setShowCheckout(false);
                  }}
                  className={cn(
                    "rounded-2xl border px-4 py-3.5 text-left transition-colors",
                    option.interval === interval
                      ? "border-primary/70 bg-primary/10"
                      : "border-foreground/10 bg-surface-2/40",
                  )}
                >
                  <span className="ui-label text-accent text-[10px]">{option.label}</span>
                  <span className="text-foreground mt-1 block text-xl font-bold">
                    {option.amountLabel}
                    <span className="text-muted-foreground ml-1.5 text-[11px] font-semibold">
                      {option.intervalLabel}
                    </span>
                  </span>
                  {option.note ? (
                    <span className="text-neon-green mt-0.5 block text-[11px] font-semibold">{option.note}</span>
                  ) : null}
                </button>
              ))}
            </div>

            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-[12px] leading-relaxed">
              Cancele quando quiser pelo gerenciamento da assinatura — o acesso continua até o fim do período
              já pago. A liberação do Premium é feita pelo servidor após a confirmação do pagamento.
            </p>

            {configured ? (
              showCheckout ? (
                <PremiumCheckout
                  key={selected.priceId}
                  priceId={selected.priceId}
                  returnUrl={`${window.location.origin}/premium?checkout=success`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  className="bg-primary text-primary-foreground focus-visible:ring-primary/60 mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[12px] font-bold focus-visible:ring-2 focus-visible:outline-none"
                >
                  ASSINAR {selected.fullLabel} 👑
                </button>
              )
            ) : (
              <p className="text-muted-foreground mt-4 text-[12px]">
                O checkout ainda não está disponível nesta versão do app.
              </p>
            )}
          </section>
        ) : null}


        <p className="text-muted-foreground mt-8 text-center text-[11px]">
          Dúvidas sobre o Premium? Fale com{" "}
          <a href="mailto:thiagospaixao.dev@gmail.com" className="text-accent underline">
            thiagospaixao.dev@gmail.com
          </a>
        </p>
      </div>
      <MobileNav />
    </ArcadeShell>
  );
}
