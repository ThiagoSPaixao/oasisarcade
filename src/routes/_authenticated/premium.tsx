import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Crown, Gamepad2, Sparkles, Trophy, Wrench } from "lucide-react";

import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { MobileNav } from "@/components/arcade/MobileNav";
import { PaymentTestModeBanner } from "@/components/premium/PaymentTestModeBanner";
import { PremiumCheckout } from "@/components/premium/PremiumCheckout";
import { useRefreshSubscription, useSubscription } from "@/hooks/use-subscription";
import { createPremiumPortalSecure } from "@/lib/payments.functions";
import { devSetPlanSecure } from "@/lib/subscription.functions";
import { PREMIUM_PLAN } from "@/lib/subscription/plan-catalog";
import { STATUS_LABEL } from "@/lib/subscription/access";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPage,
  validateSearch: (search: Record<string, unknown>): { checkout?: "success" } => ({
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

function DevPlanTools() {
  const refresh = useRefreshSubscription();
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const [pending, setPending] = useState(false);

  const setPlan = async (plan: "free" | "premium") => {
    setPending(true);
    try {
      await devSetPlanSecure({ data: { plan } });
      await refresh();
      await loadProfile();
      toast.success(`Plano de teste: ${plan.toUpperCase()}`);
    } catch {
      toast.error("Ferramenta de teste indisponível neste ambiente.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="border-neon-green/30 bg-surface-2/40 mt-8 rounded-2xl border px-4 py-4">
      <p className="ui-label text-neon-green flex items-center gap-2 text-[10px]">
        <Wrench className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" /> FERRAMENTA DEV/TESTE
      </p>
      <p className="text-muted-foreground mt-1 text-[11px]">
        Alternância de plano apenas para desenvolvimento e testes. Não é compra e não existe em produção.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void setPlan("premium")}
          className="border-neon-yellow/50 text-neon-yellow min-h-11 rounded-full border px-4 text-[11px] font-semibold disabled:opacity-60"
        >
          Ativar PREMIUM (teste)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void setPlan("free")}
          className="border-foreground/20 text-muted-foreground min-h-11 rounded-full border px-4 text-[11px] font-semibold disabled:opacity-60"
        >
          Voltar para FREE (teste)
        </button>
      </div>
    </section>
  );
}

function PremiumPage() {
  const { checkout } = Route.useSearch();
  const { subscription, isPremium } = useSubscription();
  const refresh = useRefreshSubscription();
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const [showCheckout, setShowCheckout] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const configured = isPaymentsConfigured();

  // Após o pagamento, a ativação chega pelo provedor (servidor). Reconsultamos
  // o plano algumas vezes até o servidor confirmar.
  useEffect(() => {
    if (checkout !== "success") return;
    setShowCheckout(false);
    toast.success("Pagamento recebido! Ativando seu Premium...");
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      void refresh();
      void loadProfile();
      if (tries >= 6) clearInterval(timer);
    }, 2500);
    return () => clearInterval(timer);
  }, [checkout, refresh, loadProfile]);

  const openPortal = async () => {
    setPortalPending(true);
    try {
      const result = await createPremiumPortalSecure({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/premium` },
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
            {isPremium ? "👑 Oásis Premium" : "Plano gratuito"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            {isPremium
              ? `Status: ${STATUS_LABEL[subscription.status]}${
                  subscription.currentPeriodEnd
                    ? ` · renova em ${new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                    : ""
                }`
              : "Você tem acesso a todos os jogos gratuitos, recordes, ranking, XP e conquistas."}
          </p>

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
              <Crown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" /> ASSINATURA MENSAL
            </p>
            <p className="text-foreground mt-2 text-2xl font-bold">
              {PREMIUM_PLAN.amountLabel}
              <span className="text-muted-foreground ml-1.5 text-[12px] font-semibold">
                {PREMIUM_PLAN.intervalLabel}
              </span>
            </p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-[12px] leading-relaxed">
              Cancele quando quiser pelo gerenciamento da assinatura. O acesso Premium é liberado pelo
              servidor logo após a confirmação do pagamento.
            </p>

            {configured ? (
              showCheckout ? (
                <PremiumCheckout
                  priceId={PREMIUM_PLAN.priceId}
                  returnUrl={`${window.location.origin}/premium?checkout=success`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  className="bg-primary text-primary-foreground focus-visible:ring-primary/60 mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[12px] font-bold focus-visible:ring-2 focus-visible:outline-none"
                >
                  ASSINAR O PREMIUM 👑
                </button>
              )
            ) : (
              <p className="text-muted-foreground mt-4 text-[12px]">
                O checkout ainda não está disponível nesta versão do app.
              </p>
            )}
          </section>
        ) : null}

        {import.meta.env.DEV ? <DevPlanTools /> : null}

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
