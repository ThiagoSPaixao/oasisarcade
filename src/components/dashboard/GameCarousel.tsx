import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart, Lock } from "lucide-react";
import type { Game } from "@/types/arcade";
import { cn } from "@/lib/utils";
import { useSoundStore } from "@/stores/sound-store";

const ART: Record<string, { emoji: string; from: string; to: string }> = {
  tetris: { emoji: "🧱", from: "from-neon-cyan/30", to: "to-neon-magenta/20" },
  snake: { emoji: "🐍", from: "from-neon-green/30", to: "to-neon-cyan/20" },
  memoria: { emoji: "🃏", from: "from-neon-yellow/30", to: "to-neon-magenta/20" },
  "space-shooter": { emoji: "🚀", from: "from-neon-magenta/30", to: "to-neon-cyan/20" },
  breakout: { emoji: "🧊", from: "from-neon-cyan/25", to: "to-neon-yellow/20" },
  pong: { emoji: "🏓", from: "from-neon-green/25", to: "to-neon-magenta/20" },
};

/** Carrossel de jogos com swipe, um slide grande por vez. */
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
        <div className="flex touch-pan-y">
          {games.map((game, index) => {
            const art = ART[game.slug] ?? { emoji: "🕹️", from: "from-primary/25", to: "to-accent/20" };
            const locked = game.is_premium && !isPremiumUser;
            const isFavorite = favorites.includes(game.slug);
            const active = index === selected;
            return (
              <article
                key={game.slug}
                className={cn(
                  "min-w-0 shrink-0 grow-0 basis-[82%] pr-3 transition-all duration-300 sm:basis-[52%] lg:basis-[36%]",
                  active ? "scale-100 opacity-100" : "scale-[0.92] opacity-50",
                )}
              >
                <div className="flex h-full flex-col">
                  <div
                    className={cn(
                      "relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-gradient-to-br",
                      art.from,
                      art.to,
                      active && "shadow-[0_0_44px_-18px_var(--neon-magenta)]",
                    )}
                  >
                    <span className="text-5xl drop-shadow-lg sm:text-6xl">{art.emoji}</span>
                    {game.is_premium ? (
                      <span className="border-neon-yellow/60 text-neon-yellow bg-background/50 absolute top-2 left-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide backdrop-blur">
                        PREMIUM
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        play("select");
                        onToggleFavorite(game.slug);
                      }}
                      aria-label={isFavorite ? `Remover ${game.name} dos favoritos` : `Favoritar ${game.name}`}
                      className="bg-background/50 border-foreground/10 absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full border backdrop-blur"
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          isFavorite ? "text-primary fill-current" : "text-muted-foreground",
                        )}
                        strokeWidth={1.3}
                      />
                    </button>
                    {game.state !== "playable" ? (
                      <span className="bg-background/60 text-neon-yellow absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur">
                        EM BREVE
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col items-start gap-1 px-1 pt-3">
                    <h3 className="text-foreground text-base font-semibold tracking-tight">{game.name}</h3>
                    <p className="text-muted-foreground text-[11px]">High Score · {scores[game.slug] ?? 0}</p>
                    <Link
                      to="/game/$slug"
                      params={{ slug: game.slug }}
                      onClick={() => play("coin")}
                      className="bg-primary text-primary-foreground mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold tracking-[0.12em] shadow-[0_0_22px_-8px_var(--neon-magenta)] transition-transform active:scale-95"
                    >
                      {locked ? <Lock className="h-3 w-3" strokeWidth={1.6} /> : null}
                      JOGAR AGORA
                    </Link>
                  </div>
                </div>
              </article>
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
