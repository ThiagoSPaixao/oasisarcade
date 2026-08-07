import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart, Lock, Play } from "lucide-react";
import type { Game } from "@/types/arcade";
import { cn } from "@/lib/utils";
import { gameCover } from "@/lib/game-covers";
import { useSoundStore } from "@/stores/sound-store";

/** Carrossel de jogos com swipe; o slide inteiro é clicável para abrir o jogo. */
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

  if (games.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-accent/80 text-[11px] font-semibold tracking-[0.22em]">ESCOLHA SEU JOGO</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Jogo anterior"
            onClick={() => embla?.scrollPrev()}
            className="border-accent/30 text-accent hover:border-accent/60 grid h-8 w-8 place-items-center rounded-full border transition-colors active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.3} />
          </button>
          <button
            type="button"
            aria-label="Próximo jogo"
            onClick={() => embla?.scrollNext()}
            className="border-accent/30 text-accent hover:border-accent/60 grid h-8 w-8 place-items-center rounded-full border transition-colors active:scale-95"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.3} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 flex touch-pan-y">
          {games.map((game, index) => {
            const locked = game.is_premium && !isPremiumUser;
            const isFavorite = favorites.includes(game.slug);
            const active = index === selected;
            const cover = gameCover(game.slug, game.thumbnail);
            return (
              <div
                key={game.slug}
                className="min-w-0 shrink-0 grow-0 basis-[80%] pl-3 sm:basis-[52%] lg:basis-[36%]"
              >
                <div
                  className={cn(
                    "relative transition-all duration-300",
                    active ? "opacity-100" : "scale-[0.95] opacity-45",
                  )}
                >
                  <Link
                    to="/game/$slug"
                    params={{ slug: game.slug }}
                    onClick={() => play("coin")}
                    aria-label={`Jogar ${game.name}`}
                    className={cn(
                      "border-foreground/10 bg-surface-2 block overflow-hidden rounded-2xl border transition-transform active:scale-[0.98]",
                      active && "border-primary/40 shadow-[0_0_48px_-18px_var(--neon-magenta)]",
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full">
                      {cover ? (
                        <img
                          src={cover}
                          alt={`Capa do jogo ${game.name}`}
                          loading="lazy"
                          width={768}
                          height={576}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="arcade-grid grid h-full w-full place-items-center">
                          <span className="glow-magenta text-primary text-xs font-semibold">
                            {game.name.toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="from-background via-background/30 absolute inset-0 bg-gradient-to-t to-transparent" />

                      {game.is_premium ? (
                        <span className="border-neon-yellow/60 text-neon-yellow bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide backdrop-blur">
                          PREMIUM
                        </span>
                      ) : null}
                      {game.state !== "playable" ? (
                        <span className="bg-background/60 text-neon-yellow absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
                          EM BREVE
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-4">
                      <div className="min-w-0">
                        <h3 className="text-foreground truncate text-base font-semibold tracking-tight">
                          {game.name}
                        </h3>
                        <p className="text-muted-foreground text-[11px]">
                          High Score · {scores[game.slug] ?? 0}
                        </p>
                      </div>
                      <span className="bg-primary text-primary-foreground grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-[0_0_26px_-8px_var(--neon-magenta)]">
                        {locked ? (
                          <Lock className="h-4 w-4" strokeWidth={1.8} />
                        ) : (
                          <Play className="h-4 w-4 fill-current" strokeWidth={1.8} />
                        )}
                      </span>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      play("select");
                      onToggleFavorite(game.slug);
                    }}
                    aria-label={isFavorite ? `Remover ${game.name} dos favoritos` : `Favoritar ${game.name}`}
                    className="bg-background/50 border-foreground/10 absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full border backdrop-blur"
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

      <div className="mt-5 flex justify-center gap-2">
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
    </section>
  );
}
