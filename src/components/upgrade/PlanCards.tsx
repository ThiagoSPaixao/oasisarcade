import { Check, Crown, Gamepad2, Sparkles } from "lucide-react";
import type { PlanStatus } from "@/types/arcade";

const PLANS = [
  {
    id: "free" as PlanStatus,
    name: "Player 1 (Grátis)",
    price: "R$ 0",
    period: "para sempre",
    perks: ["Jogos grátis liberados", "Recordes salvos na nuvem", "Ganhe XP e suba de nível", "1 favorito por vez"],
  },
  {
    id: "premium" as PlanStatus,
    name: "Player PRO 👑",
    price: "R$ 14,90",
    period: "por mês",
    perks: [
      "🏆 Acesso aos Torneios Semanais e Mensais com Prêmios",
      "💸 Cashback no Ranking: Top 3 semanal ganha isenção/desconto na mensalidade",
      "👑 Selo de Campeão Exclusivo no Perfil e Hall da Fama",
      "🚀 Multiplicador de XP 2x e Fichas Ilimitadas",
      "🎨 Skins Neon e D-Pads Customizados Exclusivos",
      "🔓 Todos os Jogos Premium Liberados + Acesso Antecipado",
      "🚫 Zero Anúncios entre partidas",
    ],
  },
];

export function PlanCards({
  current,
  onSelect,
  pending,
}: {
  current: PlanStatus;
  onSelect: (plan: PlanStatus) => void;
  pending?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PLANS.map((plan) => {
        const active = current === plan.id;
        const premium = plan.id === "premium";
        return (
          <div
            key={plan.id}
            className={`bg-surface flex flex-col gap-3 p-5 ${premium ? "panel-magenta" : "panel-cyan"}`}
          >
            {premium && (
              <div className="ui-label glow-magenta text-primary border-neon-magenta/50 flex items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[10px]">
                <Sparkles className="h-3 w-3" />
                LIGA PREMIADA
              </div>
            )}
            <div className="flex items-center gap-2">
              {premium ? (
                <Crown className="text-neon-yellow h-4 w-4" />
              ) : (
                <Gamepad2 className="text-accent h-4 w-4" />
              )}
              <h3 className={`ui-label text-[11px] ${premium ? "text-primary glow-magenta" : "text-accent"}`}>
                {plan.name}
              </h3>
            </div>
            <p className="ui-label text-foreground text-base">{plan.price}</p>
            <p className="text-muted-foreground text-xs">{plan.period}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {plan.perks.map((perk) => (
                <li key={perk} className="text-muted-foreground flex items-start gap-2 text-xs">
                  <Check className="text-neon-green mt-0.5 h-3 w-3 shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={active || pending}
              onClick={() => onSelect(plan.id)}
              className={`ui-label mt-auto rounded-full px-4 py-3 text-xs transition-transform active:scale-95 disabled:opacity-60 ${
                premium ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {active ? "PLANO ATUAL" : premium ? "TORNAR-SE PRO 👑" : "VOLTAR PARA O GRÁTIS"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

