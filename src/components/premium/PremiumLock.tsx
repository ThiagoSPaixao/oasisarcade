import { Crown, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

/** Selo Premium reutilizável (catálogo, perfil, dashboard). */
export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`border-neon-yellow/60 text-neon-yellow bg-background/50 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${className}`}
    >
      <Crown className="h-3 w-3" strokeWidth={1.6} aria-hidden="true" />
      PREMIUM
    </span>
  );
}

/**
 * Bloqueio de jogo Premium — mensagem clara, com texto (nunca só um cadeado)
 * e um CTA informativo. Nenhum jogo é carregado antes da autorização.
 */
export function PremiumLock({ gameName }: { gameName: string }) {
  return (
    <section
      role="region"
      aria-label={`${gameName} é um jogo Premium`}
      className="glass mx-auto mt-6 w-full max-w-md px-5 py-7 text-center"
    >
      <span className="border-neon-yellow/50 text-neon-yellow mx-auto grid h-14 w-14 place-items-center rounded-full border">
        <Lock className="h-6 w-6" strokeWidth={1.4} aria-hidden="true" />
      </span>
      <h2 className="glow-magenta text-primary mt-4 text-lg font-bold tracking-tight">🔒 JOGO PREMIUM</h2>
      <p className="text-foreground mt-2 text-sm font-semibold">{gameName}</p>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        Este jogo faz parte do Oásis Premium. Conheça o Premium para entender como o acesso aos jogos e
        recursos exclusivos vai funcionar.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/premium"
          className="bg-primary text-primary-foreground focus-visible:ring-primary/60 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[12px] font-bold focus-visible:ring-2 focus-visible:outline-none"
        >
          CONHECER O PREMIUM
        </Link>
        <Link
          to="/dashboard"
          className="border-foreground/20 text-muted-foreground hover:text-foreground focus-visible:ring-accent/60 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-[12px] font-semibold focus-visible:ring-2 focus-visible:outline-none"
        >
          VOLTAR AOS JOGOS
        </Link>
      </div>
    </section>
  );
}
