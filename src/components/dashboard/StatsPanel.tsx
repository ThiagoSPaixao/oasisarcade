import { Link } from "@tanstack/react-router";
import type { GamificationState } from "@/lib/gamification/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-foreground/5 flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground min-w-0 truncate text-[12px]">{label}</span>
      <span className="text-foreground shrink-0 text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Estatísticas simples, todas derivadas do estado de gamificação já existente. */
export function StatsPanel({ state }: { state: GamificationState | undefined }) {
  const stats = state?.stats;
  const achievements = state?.achievements ?? [];
  const unlocked = achievements.filter((a) => a.unlockedAt).length;

  return (
    <section className="glass mt-3 px-4 py-4 sm:px-5" aria-label="Suas estatísticas">
      <div className="flex items-center justify-between gap-3">
        <p className="ui-label text-accent text-[10px]">📊 SUAS ESTATÍSTICAS</p>
        <Link to="/achievements" className="text-primary text-[11px] font-semibold">
          Ver conquistas
        </Link>
      </div>
      <div className="mt-2">
        <Row label="Partidas jogadas" value={String(stats?.playsTotal ?? 0)} />
        <Row label="Jogos experimentados" value={String(stats?.gamesPlayed?.length ?? 0)} />
        <Row label="Recordes" value={String(stats?.recordsTotal ?? 0)} />
        <Row label="Melhor pontuação" value={String(stats?.bestScore ?? 0)} />
        <Row label="Conquistas" value={`${unlocked}/${achievements.filter((a) => !a.hidden || a.unlockedAt).length}`} />
        <Row
          label="Melhor sequência"
          value={`${stats?.longestStreak ?? 0} dia${(stats?.longestStreak ?? 0) === 1 ? "" : "s"}`}
        />
      </div>
    </section>
  );
}
