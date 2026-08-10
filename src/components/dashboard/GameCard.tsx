import { Link } from "@tanstack/react-router";
import { Heart, Lock, Play } from "lucide-react";
import type { CatalogGame } from "@/lib/games/catalog";
import { cn } from "@/lib/utils";
import { GameCover } from "@/components/dashboard/GameCover";

export function GameCard({
  game,
  best,
  isFavorite,
  locked,
  onToggleFavorite,
}: {
  game: CatalogGame;
  best?: number;
  isFavorite: boolean;
  locked: boolean;
  onToggleFavorite: () => void;
}) {
  const cover = game.cover;
  const inDevelopment = game.status !== "available";


  const body = (
    <>
      <div className="relative aspect-[4/3] w-full">
        <GameCover
          src={cover}
          name={game.name}
          width={768}
          height={576}
          sizes="(max-width: 640px) 170px, 200px"
        />
        <div aria-hidden="true" className="from-background via-background/25 absolute inset-0 bg-gradient-to-t to-transparent" />
        {inDevelopment ? (
          <span className="absolute inset-0 grid place-items-center">
            <span className="border-foreground/20 text-muted-foreground bg-background/60 grid h-11 w-11 place-items-center rounded-full border backdrop-blur">
              <Lock className="h-4 w-4" strokeWidth={1.6} />
            </span>
          </span>
        ) : null}
        {game.is_premium ? (
          <span className="border-neon-yellow/60 text-neon-yellow bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
            PREMIUM
          </span>
        ) : game.definition.isNew && !inDevelopment ? (
          <span className="border-neon-green/60 text-neon-green bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
            NOVO
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-3">
        <div className="min-w-0">
          <h3 className="text-foreground truncate text-sm font-semibold tracking-tight">{game.name}</h3>
          <p className="text-muted-foreground text-[11px]">
            {inDevelopment
              ? "Este Clássico está em desenvolvimento"
              : locked
                ? "Jogo Premium · toque para saber mais"
                : `High Score · ${best ?? 0}`}
          </p>
        </div>
        {inDevelopment ? null : (
          <span className="bg-primary text-primary-foreground grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-[0_0_22px_-8px_var(--neon-magenta)]">
            {locked ? <Lock className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Play className="h-3.5 w-3.5 fill-current" strokeWidth={1.8} />}
          </span>
        )}
      </div>
    </>
  );

  return (
    <article className="relative w-[170px] shrink-0 sm:w-[200px]">
      {inDevelopment ? (
        <div
          aria-disabled="true"
          className="border-foreground/10 bg-surface-2 block cursor-not-allowed overflow-hidden rounded-2xl border grayscale select-none"
        >
          {body}
        </div>
      ) : (
        <Link
          to="/game/$slug"
          params={{ slug: game.slug }}
          aria-label={locked ? `${game.name} · jogo Premium` : `Jogar ${game.name}`}
          className="border-foreground/10 bg-surface-2 block overflow-hidden rounded-2xl border transition-transform active:scale-[0.98]"
        >
          {body}
        </Link>
      )}


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
