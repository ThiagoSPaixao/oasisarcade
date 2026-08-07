import { Link } from "@tanstack/react-router";
import { Heart, Lock, Play } from "lucide-react";
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
    <article className="bg-surface pixel-border flex w-[190px] shrink-0 flex-col sm:w-[220px]">
      <div className="bg-surface-2 relative aspect-[4/3] w-full overflow-hidden">
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="arcade-grid grid h-full w-full place-items-center">
            <span className="ui-label glow-magenta text-primary text-[10px]">{game.name.toUpperCase()}</span>
          </div>
        )}
        <span
          className={cn(
            "ui-label absolute top-2 left-2 px-1.5 py-1 text-[8px]",
            game.is_premium
              ? "bg-neon-yellow text-primary-foreground"
              : "bg-neon-green text-primary-foreground",
          )}
        >
          {game.is_premium ? "PREMIUM" : "GRÁTIS"}
        </span>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className="bg-background/70 absolute top-2 right-2 grid h-8 w-8 place-items-center"
        >
          <Heart className={cn("h-4 w-4", isFavorite ? "text-primary fill-current" : "text-muted-foreground")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="ui-label text-foreground text-[10px] leading-relaxed">{game.name}</h3>
        <p className="text-muted-foreground line-clamp-2 text-xs">{game.description}</p>
        <p className="text-accent text-[10px]">Recorde: {best ?? 0}</p>
        <Link
          to="/game/$slug"
          params={{ slug: game.slug }}
          className="ui-label bg-primary text-primary-foreground mt-auto flex items-center justify-center gap-1 px-2 py-2 text-[9px] transition-transform active:scale-95"
        >
          {locked ? <Lock className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          JOGAR
        </Link>
      </div>
    </article>
  );
}
