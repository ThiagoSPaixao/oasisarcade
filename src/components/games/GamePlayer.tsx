import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SnakeGame } from "./SnakeGame";
import { TetrisGame } from "./TetrisGame";
import { MemoryGame } from "./MemoryGame";
import { ShooterGame } from "./ShooterGame";
import { BreakoutGame } from "./BreakoutGame";
import { PongGame } from "./PongGame";
import { ComingSoon } from "./ComingSoon";
import { DPad } from "./DPad";
import { SoundToggle } from "@/components/arcade/SoundToggle";
import { useGameStore } from "@/stores/game-store";
import type { Game } from "@/types/arcade";

const HINTS: Record<string, string> = {
  snake: "Setas / WASD ou D-Pad · A reinicia · B pausa",
  tetris: "← → move · ↑ ou A gira · ↓ acelera · B pausa",
  "space-shooter": "← → move · A atira · B pausa",
  breakout: "← → move a raquete · A começa · B pausa",
  pong: "← → move a raquete · A começa · B pausa",
  memoria: "Toque nas cartas para achar os pares",
};

function GameScreen({ game, onGameOver }: { game: Game; onGameOver: (score: number) => void }) {
  if (game.state !== "playable") return <ComingSoon name={game.name} />;
  switch (game.slug) {
    case "snake":
      return <SnakeGame onGameOver={onGameOver} />;
    case "tetris":
      return <TetrisGame onGameOver={onGameOver} />;
    case "memoria":
      return <MemoryGame onGameOver={onGameOver} />;
    case "space-shooter":
    case "nave":
      return <ShooterGame onGameOver={onGameOver} />;
    case "breakout":
    case "arkanoid":
      return <BreakoutGame onGameOver={onGameOver} />;
    case "pong":
      return <PongGame onGameOver={onGameOver} />;
    default:
      return <ComingSoon name={game.name} />;
  }
}

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

  const needsDPad = game.state === "playable" && game.slug !== "memoria";

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
          <h1 className="font-pixel glow-magenta text-primary truncate text-[11px] sm:text-sm">{game.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="ui-label text-right text-[9px]">
            <p className="text-accent">SCORE {score}</p>
            <p className="text-neon-yellow">HI {Math.max(storeBest, score)}</p>
          </div>
          <SoundToggle />
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
        <GameScreen game={game} onGameOver={onGameOver} />

        {needsDPad ? (
          <div className="w-full lg:max-w-xs">
            <DPad />
            <p className="text-muted-foreground mt-2 text-center text-[10px]">
              {HINTS[game.slug] ?? "A = jogar/reiniciar · B = pausar"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
