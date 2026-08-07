import { Link } from "@tanstack/react-router";
import { Heart, Lock } from "lucide-react";
import type { Game } from "@/types/arcade";
import { cn } from "@/lib/utils";

export function GameCard({
  game,
  best,
  isFavorite,
  locked,
  onToggleFavorite,
}: {
  game: Game;
  best?: number;
  isFavorite: boolean;
  locked: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="flex w-[170px] shrink-0 flex-col sm:w-[200px]">
      <div className="bg-surface-2 relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="arcade-grid grid h-full w-full place-items-center">
            <span className="glow-magenta text-primary text-xs font-semibold tracking-wide">
              {game.name.toUpperCase()}
            </span>
          </div>
        )}
        {game.is_premium ? (
          <span className="border-neon-yellow/60 text-neon-yellow bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
            PREMIUM
          </span>
        ) : null}
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className="bg-background/50 border-foreground/10 absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full border backdrop-blur"
        >
          <Heart
            className={cn("h-4 w-4", isFavorite ? "text-primary fill-current" : "text-muted-foreground")}
            strokeWidth={1.3}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-start gap-1 px-1 pt-3">
        <h3 className="text-foreground text-sm font-semibold tracking-tight">{game.name}</h3>
        <p className="text-muted-foreground text-[11px]">High Score · {best ?? 0}</p>
        <Link
          to="/game/$slug"
          params={{ slug: game.slug }}
          className="bg-primary text-primary-foreground mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold tracking-[0.12em] shadow-[0_0_22px_-8px_var(--neon-magenta)] transition-transform active:scale-95"
        >
          {locked ? <Lock className="h-3 w-3" strokeWidth={1.6} /> : null}
          JOGAR AGORA
        </Link>
      </div>
    </article>
  );
}
