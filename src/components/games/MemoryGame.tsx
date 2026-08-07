import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { cn } from "@/lib/utils";

const SYMBOLS = ["★", "♥", "♦", "☘", "♫", "☂", "☺", "⚡"];

type Card = { id: number; symbol: string; flipped: boolean; matched: boolean };

function buildDeck(): Card[] {
  return [...SYMBOLS, ...SYMBOLS]
    .map((symbol, index) => ({ id: index, symbol, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((card, index) => ({ ...card, id: index }));
}

export function MemoryGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);
  const unlock = useSoundStore((s) => s.unlock);

  const matched = useMemo(() => cards.filter((c) => c.matched).length / 2, [cards]);

  const start = useCallback(() => {
    setCards(buildDeck());
    setPicked([]);
    setMoves(0);
    setLocked(false);
    setScore(0);
    setStatus("running");
  }, [setScore, setStatus]);

  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a" && current !== "running") start();
  }, [actionInput, start]);

  const flip = (index: number) => {
    if (status !== "running" || locked) return;
    const card = cards[index];
    if (!card || card.flipped || card.matched) return;
    unlock();
    play("select");

    const next = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c));
    const chosen = [...picked, index];
    setCards(next);
    setPicked(chosen);

    if (chosen.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = chosen as [number, number];
    if (next[a]!.symbol === next[b]!.symbol) {
      play("match");
      const resolved = next.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
      setCards(resolved);
      setPicked([]);
      const pairs = resolved.filter((c) => c.matched).length / 2;
      const score = pairs * 50;
      setScore(score);
      if (pairs === SYMBOLS.length) {
        const bonus = Math.max(0, 400 - moves * 15);
        const total = score + bonus;
        setScore(total);
        play("levelup");
        setStatus("over");
        onGameOver(total);
      }
      return;
    }

    play("miss");
    setLocked(true);
    setTimeout(() => {
      setCards((current) => current.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
      setPicked([]);
      setLocked(false);
    }, 750);
  };

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <div className="bg-surface panel-cyan grid grid-cols-4 gap-2 p-3">
        {cards.map((card, index) => {
          const open = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(index)}
              aria-label={open ? `Carta ${card.symbol}` : "Carta virada para baixo"}
              className={cn(
                "grid aspect-square place-items-center text-xl transition-transform active:scale-95",
                open
                  ? card.matched
                    ? "bg-neon-green/20 pixel-border-cyan text-neon-green"
                    : "bg-surface-2 pixel-border-magenta text-primary"
                  : "bg-surface-2 pixel-border text-muted-foreground",
              )}
            >
              {open ? card.symbol : "?"}
            </button>
          );
        })}
      </div>
      <p className="ui-label text-muted-foreground mt-2 text-center text-[11px]">
        PARES {matched}/{SYMBOLS.length} · JOGADAS {moves}
      </p>

      {status !== "running" ? (
        <div className="bg-background/85 absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center backdrop-blur-sm">
          <p className="ui-label glow-cyan text-accent text-sm">
            {status === "over" ? "PARABÉNS!" : "JOGO DA MEMÓRIA"}
          </p>
          <p className="text-muted-foreground text-xs">
            {status === "over"
              ? `Você achou todos os pares em ${moves} jogadas.`
              : "Toque nas cartas e encontre todos os pares."}
          </p>
          <button
            type="button"
            onClick={() => {
              unlock();
              play("coin");
              start();
            }}
            className="ui-label bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm transition-transform active:scale-95"
          >
            {status === "over" ? "JOGAR DE NOVO" : "INSERIR FICHA"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
