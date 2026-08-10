import { Link } from "@tanstack/react-router";
import type { DailyChallengeState } from "@/lib/gamification/types";

/** Desafio do dia em destaque: título, meta, progresso e recompensa. */
export function DailyChallengeCard({
  challenge,
  loading,
}: {
  challenge: DailyChallengeState | null | undefined;
  loading?: boolean;
}) {
  if (loading && !challenge) {
    return (
      <section className="border-accent/25 bg-surface-2/30 mt-3 rounded-2xl border px-4 py-4" aria-busy="true">
        <p className="text-muted-foreground text-xs">Carregando o desafio de hoje...</p>
      </section>
    );
  }

  if (!challenge) {
    return (
      <section className="border-accent/25 bg-surface-2/30 mt-3 rounded-2xl border px-4 py-4">
        <p className="ui-label text-accent text-[10px]">🎯 DESAFIO DE HOJE</p>
        <p className="text-foreground mt-1 text-sm font-semibold">Jogue uma partida para receber seu desafio</p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          Todo dia um novo objetivo com XP extra esperando por você.
        </p>
      </section>
    );
  }

  const done = !!challenge.completedAt;
  const current = Math.min(challenge.progress, challenge.target);
  const pct = Math.min(100, Math.round((challenge.progress / Math.max(1, challenge.target)) * 100));

  return (
    <section
      className={`mt-3 rounded-2xl border px-4 py-4 ${
        done ? "border-neon-green/40 bg-neon-green/5" : "border-accent/30 bg-surface-2/30"
      }`}
      aria-label="Desafio diário"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="ui-label text-accent text-[10px]">🎯 DESAFIO DE HOJE</p>
        <span className={`shrink-0 text-[10px] font-bold ${done ? "text-neon-green" : "text-neon-yellow"}`}>
          {done ? "✓ CONCLUÍDO" : `+${challenge.xpReward} XP`}
        </span>
      </div>

      <p className="text-foreground mt-1.5 text-[15px] font-semibold leading-snug">{challenge.title}</p>
      <p className="text-muted-foreground mt-0.5 text-[11px]">{challenge.description}</p>

      <div
        className="bg-surface-2 mt-2.5 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do desafio de hoje"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${done ? "bg-neon-green" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {current} / {challenge.target}
        </p>
        {done ? (
          <span className="text-neon-green text-[11px] font-semibold">+{challenge.xpReward} XP recebidos</span>
        ) : challenge.gameSlug ? (
          <Link
            to="/game/$slug"
            params={{ slug: challenge.gameSlug }}
            className="border-primary/50 text-primary rounded-full border px-3.5 py-1.5 text-[11px] font-semibold"
          >
            JOGAR AGORA
          </Link>
        ) : null}
      </div>
    </section>
  );
}
