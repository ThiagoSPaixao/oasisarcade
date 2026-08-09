import { Link } from "@tanstack/react-router";
import { Flame, Trophy, Target, Zap } from "lucide-react";
import { levelProgress } from "@/lib/gamification/levels";
import type { GamificationState } from "@/lib/gamification/types";

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="border-foreground/10 bg-surface-2/40 flex items-center gap-2 rounded-2xl border px-3 py-2">
      <span className={tone}>{icon}</span>
      <span className="min-w-0">
        <span className="text-foreground block text-[13px] font-semibold leading-none">{value}</span>
        <span className="text-muted-foreground ui-label block text-[9px] leading-none">{label}</span>
      </span>
    </div>
  );
}

export function ProgressPanel({ state }: { state: GamificationState | undefined }) {
  if (!state) return null;
  const progress = levelProgress(state.xp, state.level);
  const unlocked = state.achievements.filter((a) => a.unlockedAt).length;
  const total = state.achievements.filter((a) => !a.hidden || a.unlockedAt).length;
  const challenge = state.challenge;
  const challengePct = challenge
    ? Math.min(100, Math.round((challenge.progress / Math.max(1, challenge.target)) * 100))
    : 0;
  const challengeDone = !!challenge?.completedAt;

  return (
    <section className="glass mt-3 px-4 py-4 sm:px-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="ui-label text-accent text-[10px]">MINHA PROGRESSÃO</p>
          <p className="glow-magenta text-primary text-lg font-bold tracking-tight">
            LEVEL {String(progress.level).padStart(2, "0")}
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-[11px]">
          {progress.xpInLevel} / {progress.xpNeeded} XP
          {progress.isMax ? null : (
            <span className="text-neon-yellow"> · faltam {progress.xpRemaining}</span>
          )}
        </p>
      </div>

      <div
        className="bg-surface-2 mt-2 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do nível"
      >
        <div
          className="from-accent to-primary h-full rounded-full bg-gradient-to-r transition-[width] duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={<Flame className="h-4 w-4" strokeWidth={1.4} />}
          label="SEQUÊNCIA"
          value={`${state.stats.currentStreak} dia${state.stats.currentStreak === 1 ? "" : "s"}`}
          tone="text-primary"
        />
        <Stat
          icon={<Trophy className="h-4 w-4" strokeWidth={1.4} />}
          label="RECORDE STREAK"
          value={`${state.stats.longestStreak} dias`}
          tone="text-neon-yellow"
        />
        <Stat
          icon={<Zap className="h-4 w-4" strokeWidth={1.4} />}
          label="PARTIDAS"
          value={String(state.stats.playsTotal)}
          tone="text-accent"
        />
        <Link to="/achievements" className="block">
          <Stat
            icon={<Target className="h-4 w-4" strokeWidth={1.4} />}
            label="CONQUISTAS"
            value={`${unlocked}/${total}`}
            tone="text-neon-green"
          />
        </Link>
      </div>

      {challenge ? (
        <div className="border-accent/25 bg-surface-2/30 mt-3 rounded-2xl border px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="ui-label text-accent text-[10px]">DESAFIO DE HOJE</p>
            <span
              className={`text-[10px] font-semibold ${challengeDone ? "text-neon-green" : "text-neon-yellow"}`}
            >
              {challengeDone ? "CONCLUÍDO ✓" : `+${challenge.xpReward} XP`}
            </span>
          </div>
          <p className="text-foreground mt-1 text-[13px] font-semibold">{challenge.title}</p>
          <p className="text-muted-foreground text-[11px]">{challenge.description}</p>
          <div className="bg-surface-2 mt-2 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${challengeDone ? "bg-neon-green" : "bg-accent"}`}
              style={{ width: `${challengePct}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-1 text-[10px]">
            {Math.min(challenge.progress, challenge.target)} / {challenge.target}
          </p>
        </div>
      ) : null}
    </section>
  );
}
