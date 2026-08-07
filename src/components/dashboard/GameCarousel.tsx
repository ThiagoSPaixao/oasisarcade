import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart, Lock, Play } from "lucide-react";
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
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="ui-label glow-cyan text-accent text-[11px] sm:text-sm">ESCOLHA SEU JOGO</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Jogo anterior"
            onClick={() => embla?.scrollPrev()}
            className="pixel-border bg-surface text-accent grid h-9 w-9 place-items-center active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo jogo"
            onClick={() => embla?.scrollNext()}
            className="pixel-border bg-surface text-accent grid h-9 w-9 place-items-center active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
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
                  active ? "scale-100 opacity-100" : "scale-[0.92] opacity-60",
                )}
              >
                <div className="bg-surface pixel-border-magenta flex h-full flex-col">
                  <div
                    className={cn(
                      "relative grid aspect-[4/3] w-full place-items-center bg-gradient-to-br",
                      art.from,
                      art.to,
                    )}
                  >
                    <span className="text-5xl drop-shadow-lg sm:text-6xl">{art.emoji}</span>
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
                      onClick={() => {
                        play("select");
                        onToggleFavorite(game.slug);
                      }}
                      aria-label={isFavorite ? `Remover ${game.name} dos favoritos` : `Favoritar ${game.name}`}
                      className="bg-background/70 absolute top-2 right-2 grid h-9 w-9 place-items-center"
                    >
                      <Heart
                        className={cn("h-4 w-4", isFavorite ? "text-primary fill-current" : "text-muted-foreground")}
                      />
                    </button>
                    {game.state !== "playable" ? (
                      <span className="ui-label bg-background/80 text-neon-yellow absolute bottom-2 left-2 px-1.5 py-1 text-[8px]">
                        EM BREVE
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="ui-label text-foreground text-[11px] leading-relaxed">{game.name}</h3>
                    <p className="text-muted-foreground text-xs">{game.description}</p>
                    <p className="text-accent text-[10px]">Seu recorde: {scores[game.slug] ?? 0}</p>
                    <Link
                      to="/game/$slug"
                      params={{ slug: game.slug }}
                      onClick={() => play("coin")}
                      className="ui-label bg-primary text-primary-foreground mt-auto flex items-center justify-center gap-2 px-3 py-3 text-[10px] transition-transform active:scale-95"
                    >
                      {locked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      JOGAR AGORA
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {games.map((game, index) => (
          <button
            key={game.slug}
            type="button"
            aria-label={`Ir para ${game.name}`}
            onClick={() => embla?.scrollTo(index)}
            className={cn(
              "h-2 transition-all",
              index === selected ? "bg-primary w-6" : "bg-surface-2 w-2",
            )}
          />
        ))}
      </div>
    </section>
  );
}
