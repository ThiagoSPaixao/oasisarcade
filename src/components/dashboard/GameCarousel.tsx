import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart, Lock } from "lucide-react";
import type { Game } from "@/types/arcade";
import { cn } from "@/lib/utils";
import { gameCover } from "@/lib/game-covers";
import { GameCover, preloadCover } from "@/components/dashboard/GameCover";
import { useSoundStore } from "@/stores/sound-store";

/** Carrossel de jogos no formato "JOGO DO DIA": card alto com capa, descrição e CTA. */
export function GameCarousel({
  games,
  scores,
  favorites,
  isPremiumUser,
  onToggleFavorite,
}: {
  games: Game[];
  scores: Record<string, number>;
  favorites: string[];
  isPremiumUser: boolean;
  onToggleFavorite: (slug: string) => void;
}) {
  const [emblaRef, embla] = useEmblaCarousel({ align: "center", loop: true, skipSnaps: false });
  const [selected, setSelected] = useState(0);
  const play = useSoundStore((s) => s.play);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
    play("select");
  }, [embla, play]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  // Pré-carrega apenas as capas vizinhas do slide atual (economiza dados no mobile).
  useEffect(() => {
    if (games.length === 0) return;
    const neighbors = [selected + 1, selected - 1].map(
      (i) => games[(i + games.length) % games.length],
    );
    for (const game of neighbors) {
      if (game) preloadCover(gameCover(game.slug, game.thumbnail));
    }
  }, [games, selected]);

  if (games.length === 0) return null;

  return (
    <section className="mt-5 w-full min-w-0">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 flex touch-pan-y">
          {games.map((game, index) => {
            const locked = game.is_premium && !isPremiumUser;
            const isFavorite = favorites.includes(game.slug);
            const active = index === selected;
            const cover = gameCover(game.slug, game.thumbnail);
            return (
              <div key={game.slug} className="min-w-0 shrink-0 grow-0 basis-[82%] pl-3 sm:basis-[58%] lg:basis-[40%]">
                <div
                  className={cn(
                    "relative rounded-3xl transition-all duration-300",
                    active
                      ? "border-accent bg-surface/70 border shadow-[0_0_60px_-18px_var(--neon-cyan)]"
                      : "border-foreground/10 bg-surface/40 scale-[0.94] border opacity-55",
                  )}
                >
                  <Link
                    to="/game/$slug"
                    params={{ slug: game.slug }}
                    onClick={() => play("coin")}
                    aria-label={`Jogar ${game.name}`}
                    className="block p-4 sm:p-5"
                  >
                    {active ? (
                      <p className="text-foreground/90 mb-1 text-center text-xs font-bold tracking-[0.22em]">
                        JOGO DO DIA
                      </p>
                    ) : null}
                    <h2 className="glow-magenta text-primary mb-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
                      {game.name.toUpperCase()}
                    </h2>

                    <div className="bg-surface-2 relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
                      <GameCover src={cover} name={game.name} width={768} height={480} priority={active} />
                      {game.is_premium ? (
                        <span className="border-neon-yellow/60 text-neon-yellow bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
                          PREMIUM
                        </span>
                      ) : null}
                      {game.state !== "playable" ? (
                        <span className="bg-background/60 text-neon-yellow absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
                          EM BREVE
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-foreground mt-4 text-lg font-bold tracking-tight">
                      {game.name.toUpperCase()}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-snug">{game.description}</p>
                    <p className="text-muted-foreground/80 mt-2 text-xs font-semibold tracking-[0.12em]">
                      RECORD: {scores[game.slug] ?? 0}
                    </p>

                    <span className="bg-primary text-primary-foreground mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold tracking-[0.14em] shadow-[0_0_30px_-8px_var(--neon-magenta)] transition-transform active:scale-95">
                      {locked ? <Lock className="h-4 w-4" strokeWidth={1.8} /> : null}
                      JOGAR AGORA
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      play("select");
                      onToggleFavorite(game.slug);
                    }}
                    aria-label={isFavorite ? `Remover ${game.name} dos favoritos` : `Favoritar ${game.name}`}
                    className="bg-background/50 border-foreground/10 absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full border backdrop-blur"
                  >
                    <Heart
                      className={cn("h-4 w-4", isFavorite ? "text-primary fill-current" : "text-muted-foreground")}
                      strokeWidth={1.3}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Jogo anterior"
          onClick={() => embla?.scrollPrev()}
          className="border-accent/30 text-accent hover:border-accent/60 grid h-8 w-8 place-items-center rounded-full border transition-colors active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.3} />
        </button>
        <div className="flex gap-2">
          {games.map((game, index) => (
            <button
              key={game.slug}
              type="button"
              aria-label={`Ir para ${game.name}`}
              onClick={() => embla?.scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === selected ? "bg-accent w-6" : "bg-foreground/20 w-1.5",
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Próximo jogo"
          onClick={() => embla?.scrollNext()}
          className="border-accent/30 text-accent hover:border-accent/60 grid h-8 w-8 place-items-center rounded-full border transition-colors active:scale-95"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.3} />
        </button>
      </div>
    </section>
  );
}
