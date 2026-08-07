import { Link } from "@tanstack/react-router";
import type { Game } from "@/types/arcade";

export function DailyBanner({ game }: { game: Game }) {
  return (
    <section className="bg-surface/60 border-accent/30 relative mt-6 overflow-hidden rounded-2xl border p-5 shadow-[0_0_50px_-22px_var(--neon-cyan)] backdrop-blur-md sm:p-8">
      <div className="arcade-grid absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative flex flex-col gap-3">
        <span className="text-accent/80 text-[11px] font-semibold tracking-[0.22em]">JOGO DO DIA</span>
        <h2 className="glow-magenta text-primary text-2xl font-bold tracking-tight sm:text-4xl">{game.name}</h2>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">{game.description}</p>
        <Link
          to="/game/$slug"
          params={{ slug: game.slug }}
          className="bg-primary text-primary-foreground mt-1 inline-flex w-fit items-center rounded-full px-6 py-3 text-xs font-bold tracking-[0.14em] shadow-[0_0_28px_-8px_var(--neon-magenta)] transition-transform active:scale-95"
        >
          JOGAR AGORA
        </Link>
      </div>
    </section>
  );
}
