import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Trophy } from "lucide-react";

import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { MobileNav } from "@/components/arcade/MobileNav";
import { fetchGamificationState, GAMIFICATION_QUERY_KEY } from "@/lib/gamification/events";
import type { AchievementState } from "@/lib/gamification/types";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Conquistas · Oásis Arcade" },
      {
        name: "description",
        content: "Acompanhe suas conquistas, XP e progresso no Oásis Arcade.",
      },
      { property: "og:title", content: "Conquistas · Oásis Arcade" },
      {
        property: "og:description",
        content: "Acompanhe suas conquistas, XP e progresso no Oásis Arcade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AchievementsPage,
});

function AchievementCard({ achievement }: { achievement: AchievementState }) {
  const unlocked = !!achievement.unlockedAt;
  const pct = Math.min(100, Math.round((achievement.progress / Math.max(1, achievement.target)) * 100));
  return (
    <li
      className={`panel bg-surface flex items-start gap-3 px-4 py-3.5 ${
        unlocked ? "border-neon-green/40" : "border-foreground/10"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
          unlocked ? "border-neon-green/50 text-neon-green" : "border-foreground/15 text-muted-foreground"
        }`}
      >
        {unlocked ? <Trophy className="h-4 w-4" strokeWidth={1.4} /> : <Lock className="h-4 w-4" strokeWidth={1.4} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-foreground truncate text-sm font-semibold">{achievement.name}</p>
          <span className={`shrink-0 text-[10px] font-semibold ${unlocked ? "text-neon-green" : "text-neon-yellow"}`}>
            {unlocked ? "DESBLOQUEADA ✓" : `+${achievement.xpReward} XP`}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-[11px]">{achievement.description}</p>
        {unlocked ? null : (
          <>
            <div className="bg-surface-2 mt-2 h-1.5 w-full overflow-hidden rounded-full">
              <div className="bg-accent h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {Math.min(achievement.progress, achievement.target)} / {achievement.target}
            </p>
          </>
        )}
      </div>
    </li>
  );
}

function AchievementsPage() {
  const stateQuery = useQuery({ queryKey: GAMIFICATION_QUERY_KEY, queryFn: fetchGamificationState });
  const achievements = (stateQuery.data?.achievements ?? []).filter((a) => !a.hidden || a.unlockedAt);
  const unlockedList = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);
  const unlocked = unlockedList.length;
  const overallPct = achievements.length
    ? Math.round((unlocked / achievements.length) * 100)
    : 0;

  return (
    <ArcadeShell className="px-4 py-5 pb-28 sm:px-6">

      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Voltar ao dashboard"
            className="border-foreground/15 text-muted-foreground hover:text-primary hover:border-primary/40 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.3} />
          </Link>
          <div className="min-w-0">
            <h1 className="glow-magenta text-primary text-lg font-bold tracking-tight">🏆 CONQUISTAS</h1>
            <p className="text-muted-foreground text-[11px]">
              {unlocked} de {achievements.length} desbloqueadas
            </p>
          </div>
        </div>

        <div
          className="bg-surface-2 mt-1 h-2 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={overallPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso geral das conquistas"
        >
          <div
            className="from-accent to-neon-green h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {stateQuery.isError ? (
          <p className="border-primary/30 text-muted-foreground mt-4 rounded-2xl border px-4 py-3 text-xs">
            Não foi possível carregar suas conquistas. Tente novamente em instantes.
          </p>
        ) : null}

        {stateQuery.isLoading ? (
          <p className="ui-label text-accent mt-4 text-xs">CARREGANDO...</p>
        ) : achievements.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">
            Jogue sua primeira partida para começar a desbloquear conquistas.
          </p>
        ) : (
          <>
            {locked.length > 0 ? (
              <section className="mt-6">
                <h2 className="ui-label text-accent text-xs">EM PROGRESSO</h2>
                <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {locked.map((achievement) => (
                    <AchievementCard key={achievement.slug} achievement={achievement} />
                  ))}
                </ul>
              </section>
            ) : null}

            {unlockedList.length > 0 ? (
              <section className="mt-6">
                <h2 className="ui-label text-neon-green text-xs">DESBLOQUEADAS</h2>
                <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  {unlockedList.map((achievement) => (
                    <AchievementCard key={achievement.slug} achievement={achievement} />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
      <MobileNav />
    </ArcadeShell>
  );
}
