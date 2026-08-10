import { levelProgress } from "@/lib/gamification/levels";
import type { GamificationState } from "@/lib/gamification/types";
import type { Profile } from "@/types/arcade";
import { Gamepad2 } from "lucide-react";

/**
 * Card de progressão do jogador: identidade + nível + XP.
 * A curva de XP vem de @/lib/gamification/levels (espelho do banco) —
 * nenhuma regra de XP é recalculada aqui.
 */
export function PlayerProgressCard({
  profile,
  state,
  loading,
}: {
  profile: Profile | null;
  state: GamificationState | undefined;
  loading?: boolean;
}) {
  const xp = state?.xp ?? profile?.xp ?? 0;
  const level = state?.level ?? profile?.level ?? 1;
  const progress = levelProgress(xp, level);
  const username = profile?.username ?? "Player";

  if (loading && !state) {
    return (
      <section className="glass mt-3 px-4 py-4 sm:px-5" aria-busy="true">
        <p className="text-muted-foreground text-xs">Carregando seu progresso...</p>
        <div className="bg-surface-2 mt-3 h-2 w-full animate-pulse rounded-full" />
      </section>
    );
  }

  return (
    <section className="glass mt-3 px-4 py-4 sm:px-5" aria-label="Sua progressão">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span className="border-accent/40 grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={`Avatar de ${username}`} className="h-full w-full object-cover" />
          ) : (
            <Gamepad2 className="text-accent h-5 w-5" strokeWidth={1.2} />
          )}
        </span>
        <div className="min-w-0">
          <p className="ui-label text-accent text-[10px]">MINHA PROGRESSÃO</p>
          <p className="text-foreground truncate text-sm font-semibold">{username}</p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="glow-magenta text-primary text-lg font-bold tracking-tight">
          NÍVEL {String(progress.level).padStart(2, "0")}
        </p>
        <p className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
          {progress.xpInLevel} / {progress.xpNeeded} XP
        </p>
      </div>

      <div
        className="bg-surface-2 mt-2 h-2.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso do nível: ${progress.percent}%`}
      >
        <div
          className="from-accent to-primary h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <p className="text-muted-foreground mt-1.5 text-[11px]">
        {progress.isMax ? (
          <span className="text-neon-yellow">Nível máximo alcançado 👑</span>
        ) : (
          <>
            <span className="text-neon-yellow font-semibold">{progress.xpRemaining} XP</span> para o nível{" "}
            {progress.level + 1} · {progress.percent}% concluído
          </>
        )}
      </p>
    </section>
  );
}
