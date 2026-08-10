import { Flame } from "lucide-react";
import type { PlayerStats } from "@/lib/gamification/types";

/** Sequência (streak) com tom de incentivo — nunca punitivo. */
export function StreakCard({ stats }: { stats: PlayerStats | undefined }) {
  const current = stats?.currentStreak ?? 0;
  const longest = stats?.longestStreak ?? 0;

  return (
    <section
      className="border-foreground/10 bg-surface-2/40 mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-4 py-3.5"
      aria-label="Sua sequência diária"
    >
      <span className="border-primary/40 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-full border">
        <Flame className="h-5 w-5" strokeWidth={1.4} />
      </span>
      <div className="min-w-0">
        {current > 0 ? (
          <>
            <p className="text-foreground text-sm font-semibold">
              🔥 {current} dia{current === 1 ? "" : "s"} seguido{current === 1 ? "" : "s"}
            </p>
            <p className="text-muted-foreground text-[11px]">
              Seu maior recorde: {longest} dia{longest === 1 ? "" : "s"} · volte amanhã para continuar
            </p>
          </>
        ) : (
          <>
            <p className="text-foreground text-sm font-semibold">🔥 Comece sua sequência hoje!</p>
            <p className="text-muted-foreground text-[11px]">
              {longest > 0
                ? `Seu maior recorde foi de ${longest} dia${longest === 1 ? "" : "s"} — dá pra superar.`
                : "Jogue uma partida por dia e acumule XP extra."}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
