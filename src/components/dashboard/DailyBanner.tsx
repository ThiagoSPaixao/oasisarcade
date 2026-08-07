import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import type { Game } from "@/types/arcade";

export function DailyBanner({ game }: { game: Game }) {
  return (
    <section className="bg-surface pixel-border-cyan relative mt-6 overflow-hidden p-5 sm:p-8">
      <div className="arcade-grid absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative flex flex-col gap-4">
        <span className="font-pixel glow-yellow text-neon-yellow text-[9px]">JOGO DO DIA</span>
        <h2 className="font-pixel glow-magenta text-primary neon-pulse text-xl sm:text-3xl">{game.name}</h2>
        <p className="text-muted-foreground max-w-md text-sm">{game.description}</p>
        <Link
          to="/game/$slug"
          params={{ slug: game.slug }}
          className="font-pixel bg-primary text-primary-foreground inline-flex w-fit items-center gap-2 px-4 py-3 text-[10px] transition-transform active:scale-95"
        >
          <Play className="h-4 w-4" />
          JOGAR AGORA
        </Link>
      </div>
    </section>
  );
}
