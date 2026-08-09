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
import { GameSettingsMenu } from "./GameSettingsMenu";
import { AnalogPad } from "./AnalogPad";
import { TetrisPad } from "./TetrisPad";
import { useGameOptions, useSettingsStore } from "@/stores/settings-store";
import { useGameStore } from "@/stores/game-store";
import { DIFFICULTY_META } from "@/lib/game-options";
import type { Game } from "@/types/arcade";

const HINTS: Record<string, string> = {
  snake: "Setas / WASD ou D-Pad · A reinicia · B pausa",
  tetris: "Analógico move · centro (A) gira · botão ao lado desce rápido",
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

  const controlMode = useSettingsStore((s) => s.controlMode);
  const options = useGameOptions(game.slug);
  const difficulty = DIFFICULTY_META[options.difficulty];

  // Trava o scroll enquanto o jogo está aberto: tudo cabe na tela do aparelho.
  useEffect(() => {
    document.documentElement.classList.add("game-locked");
    return () => document.documentElement.classList.remove("game-locked");
  }, []);

  useEffect(() => {
    setActiveGame(game.slug);
    return () => setActiveGame(null);
  }, [game.slug, setActiveGame]);

  useEffect(() => {
    setBest(best);
  }, [best, setBest]);

  const needsDPad = game.state === "playable" && game.slug !== "memoria";
  // Tetris prioriza a área de jogo: controles compactos, como nos clássicos.
  const compactPad = game.slug === "tetris";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-4">
      <div className="glass grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link
          to="/dashboard"
          aria-label="Voltar ao dashboard"
          className="border-foreground/15 text-muted-foreground hover:text-primary hover:border-primary/40 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.3} />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="glow-magenta text-primary truncate text-base font-bold tracking-tight sm:text-lg">
            {game.name}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            <span className="text-accent font-semibold">Score {score}</span>
            <span className="opacity-40"> · </span>
            <span className="text-neon-yellow font-semibold">High {Math.max(storeBest, score)}</span>
            {game.state === "playable" ? (
              <>
                <span className="opacity-40"> · </span>
                <span className="ui-label text-primary/80 text-[10px]">
                  {difficulty.short} · {difficulty.multiplier}x
                </span>
              </>
            ) : null}
          </p>
        </div>
        {game.state === "playable" ? <GameSettingsMenu slug={game.slug} /> : <span />}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-5 lg:flex-row lg:items-center lg:justify-center">
        <GameScreen game={game} onGameOver={onGameOver} />

        {needsDPad ? (
          <div
            className={
              compactPad
                ? "mx-auto w-full max-w-[300px] shrink-0 lg:max-w-[260px]"
                : "mx-auto w-full max-w-sm shrink-0 lg:max-w-xs"
            }
          >
            {compactPad ? (
              <TetrisPad />
            ) : controlMode === "analog" ? (
              <AnalogPad compact={compactPad} />
            ) : (
              <DPad compact={compactPad} />
            )}
            <p className="text-muted-foreground/80 mt-1.5 text-center text-[10px] leading-relaxed sm:mt-3">
              {HINTS[game.slug] ?? "A = jogar/reiniciar · B = pausar"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
