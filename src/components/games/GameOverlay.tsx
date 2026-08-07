import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";

/** Tela de estado (início/pausa/game over) desenhada sobre o canvas do jogo. */
export function GameOverlay({
  title,
  hint,
  onStart,
}: {
  title: string;
  hint: string;
  onStart: () => void;
}) {
  const status = useGameStore((s) => s.status);
  const score = useGameStore((s) => s.score);
  const unlock = useSoundStore((s) => s.unlock);
  const play = useSoundStore((s) => s.play);

  if (status === "running") return null;

  return (
    <div className="bg-background/85 absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center backdrop-blur-sm">
      <p className="ui-label glow-cyan text-accent text-sm sm:text-base">
        {status === "over" ? "GAME OVER" : status === "paused" ? "PAUSADO" : title}
      </p>
      {status === "over" ? (
        <p className="ui-label text-neon-yellow text-[10px]">PONTOS {score}</p>
      ) : null}
      <p className="text-muted-foreground max-w-xs text-xs">
        {status === "paused" ? "Aperte B ou espaço para continuar" : hint}
      </p>
      <button
        type="button"
        onClick={() => {
          unlock();
          play("coin");
          onStart();
        }}
        className="ui-label bg-primary text-primary-foreground pixel-border-magenta px-4 py-3 text-xs transition-transform active:scale-95"
      >
        {status === "over" ? "JOGAR DE NOVO" : status === "paused" ? "CONTINUAR" : "INSERIR FICHA"}
      </button>
    </div>
  );
}
