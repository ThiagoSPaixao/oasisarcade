import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SnakeGame } from "./SnakeGame";
import { ComingSoon } from "./ComingSoon";
import { DPad } from "./DPad";
import { useGameStore } from "@/stores/game-store";
import type { Game } from "@/types/arcade";

export function GamePlayer({
  game,
  best,
  onGameOver,
}: {
  game: Game;
  best: number;
  onGameOver: (score: number) => void;
}) {
  const setActiveGame = useGameStore((s) => s.setActiveGame);
  const setBest = useGameStore((s) => s.setBest);
  const score = useGameStore((s) => s.score);
  const storeBest = useGameStore((s) => s.best);

  useEffect(() => {
    setActiveGame(game.slug);
    return () => setActiveGame(null);
  }, [game.slug, setActiveGame]);

  useEffect(() => {
    setBest(best);
  }, [best, setBest]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Voltar ao dashboard"
            className="pixel-border text-muted-foreground hover:text-primary grid h-9 w-9 shrink-0 place-items-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-pixel glow-magenta text-primary truncate text-xs sm:text-base">{game.name}</h1>
        </div>
        <div className="font-pixel text-right text-[9px]">
          <p className="text-accent">SCORE {score}</p>
          <p className="text-neon-yellow">HI {Math.max(storeBest, score)}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start">
        {game.state === "playable" && game.slug === "snake" ? (
          <SnakeGame onGameOver={onGameOver} />
        ) : (
          <ComingSoon name={game.name} />
        )}

        <div className="w-full lg:max-w-xs">
          <DPad />
          <p className="text-muted-foreground mt-2 text-center text-[10px]">
            A = jogar/reiniciar · B = pausar · teclado: setas, WASD, espaço
          </p>
        </div>
      </div>
    </div>
  );
}
