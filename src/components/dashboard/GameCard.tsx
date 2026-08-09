import { Link } from "@tanstack/react-router";
import { Heart, Lock, Play } from "lucide-react";
import type { Game } from "@/types/arcade";
import { cn } from "@/lib/utils";
import { gameCover } from "@/lib/game-covers";

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
  const cover = gameCover(game.slug, game.thumbnail);

  return (
    <article className="relative w-[170px] shrink-0 sm:w-[200px]">
      <Link
        to="/game/$slug"
        params={{ slug: game.slug }}
        aria-label={`Jogar ${game.name}`}
        className="border-foreground/10 bg-surface-2 block overflow-hidden rounded-2xl border transition-transform active:scale-[0.98]"
      >
        <div className="relative aspect-[4/3] w-full">
          <GameCover src={cover} name={game.name} width={768} height={576} />
          <div className="from-background via-background/25 absolute inset-0 bg-gradient-to-t to-transparent" />
          {game.is_premium ? (
            <span className="border-neon-yellow/60 text-neon-yellow bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
              PREMIUM
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-3">
          <div className="min-w-0">
            <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">{game.name}</h3>
            <p className="text-muted-foreground text-[11px]">High Score · {best ?? 0}</p>
          </div>
          <span className="bg-primary text-primary-foreground grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-[0_0_22px_-8px_var(--neon-magenta)]">
            {locked ? <Lock className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Play className="h-3.5 w-3.5 fill-current" strokeWidth={1.8} />}
          </span>
        </div>
      </Link>

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
    </article>
  );
}
