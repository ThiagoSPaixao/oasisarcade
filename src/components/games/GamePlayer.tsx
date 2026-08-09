import { Suspense, useEffect } from "react";
import { stopMusic } from "@/lib/sound";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ComingSoon } from "./ComingSoon";
import { DPad } from "./DPad";
import { GameSettingsMenu } from "./GameSettingsMenu";
import { AnalogPad } from "./AnalogPad";
import { TetrisPad } from "./TetrisPad";
import { useGameOptions, useSettingsStore } from "@/stores/settings-store";
import { useGameStore } from "@/stores/game-store";
import { DIFFICULTY_META } from "@/lib/game-options";
import type { CatalogGame } from "@/lib/games/catalog";

function GameScreen({ game, onGameOver }: { game: CatalogGame; onGameOver: (score: number) => void }) {
  const Component = game.definition.component;
  if (game.status !== "available" || !Component) return <ComingSoon name={game.name} />;
  return (
    <Suspense
      fallback={
        <div className="bg-surface panel grid aspect-square w-full max-w-[520px] place-items-center">
          <p className="ui-label text-accent text-xs">CARREGANDO JOGO...</p>
        </div>
      }
    >
      <Component onGameOver={onGameOver} />
    </Suspense>
  );
}

export function GamePlayer({
  game,
  best,
  onGameOver,
}: {
  game: CatalogGame;
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
  const { controls, controlHint, musicTheme } = game.definition;

  // Trava o scroll enquanto o jogo está aberto: tudo cabe na tela do aparelho.
  useEffect(() => {
    document.documentElement.classList.add("game-locked");
    return () => document.documentElement.classList.remove("game-locked");
  }, []);

  useEffect(() => {
    setActiveGame(game.slug);
    return () => setActiveGame(null);
  }, [game.slug, setActiveGame]);

  // Jogos sem tema próprio ficam em silêncio (só efeitos). Quem tem tema cuida da própria música.
  useEffect(() => {
    if (!musicTheme) stopMusic();
  }, [musicTheme]);

  useEffect(() => {
    setBest(best);
  }, [best, setBest]);

  const available = game.status === "available";
  const showPad = available && controls !== "none";
  // Tetris prioriza a área de jogo: controles compactos, como nos clássicos.
  const compactPad = controls === "tetris";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-4">
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
            {available ? (
              <>
                <span className="opacity-40"> · </span>
                <span className="ui-label text-primary/80 text-[10px]">
                  {difficulty.short} · {difficulty.multiplier}x
                </span>
              </>
            ) : null}
          </p>
        </div>
        {available ? <GameSettingsMenu slug={game.slug} /> : <span />}
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-5 lg:flex-row lg:items-center lg:justify-center">
        <GameScreen game={game} onGameOver={onGameOver} />

        {showPad ? (
          <div
            className={
              compactPad
                ? "mx-auto w-full max-w-[300px] shrink-0 lg:max-w-[260px]"
                : "mx-auto w-full max-w-sm shrink-0 lg:max-w-xs"
            }
          >
            {controls === "tetris" ? (
              <TetrisPad />
            ) : controls === "directional" ? (
              controlMode === "analog" ? (
                <AnalogPad noActions />
              ) : (
                <DPad noActions />
              )
            ) : controlMode === "analog" ? (
              <AnalogPad />
            ) : (
              <DPad />
            )}
            <p className="text-muted-foreground/80 mt-1.5 text-center text-[10px] leading-relaxed sm:mt-3">
              {controlHint}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
