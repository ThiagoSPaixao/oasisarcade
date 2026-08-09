import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { useGameOptions } from "@/stores/settings-store";
import { MEMORY_PAIRS, gain } from "@/lib/game-options";
import { pickMemoryIcons, type MemoryIcon } from "@/lib/memory-cards";
import { cn } from "@/lib/utils";

type Card = { id: number; icon: MemoryIcon; flipped: boolean; matched: boolean };

function buildDeck(pairs: number): Card[] {
  const chosen = pickMemoryIcons(pairs);
  return [...chosen, ...chosen]
    .map((icon, index) => ({ id: index, icon, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((card, index) => ({ ...card, id: index }));
}


export function MemoryGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const options = useGameOptions("memoria");
  const pairs = MEMORY_PAIRS[options.difficulty];
  const cols = pairs > 8 ? 5 : 4;
  const rows = Math.ceil((pairs * 2) / cols);

  const [cards, setCards] = useState<Card[]>(() => buildDeck(pairs));
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
    setCards(buildDeck(pairs));
    setPicked([]);
    setMoves(0);
    setLocked(false);
    setScore(0);
    setStatus("running");
  }, [pairs, setScore, setStatus]);

  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a" && current !== "running") start();
  }, [actionInput, start]);

  // Mudar a dificuldade monta um tabuleiro novo
  useEffect(() => {
    setCards(buildDeck(pairs));
    setPicked([]);
    setMoves(0);
    setLocked(false);
    setScore(0);
    setStatus("idle");
  }, [pairs, setScore, setStatus]);

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
    if (next[a]!.icon.id === next[b]!.icon.id) {
      play("match");
      const resolved = next.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
      setCards(resolved);
      setPicked([]);
      const found = resolved.filter((c) => c.matched).length / 2;
      const score = gain(found * 50, options.difficulty);
      setScore(score);
      if (found === pairs) {
        const bonus = gain(Math.max(0, 400 - moves * 15), options.difficulty);
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
    <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2">
      <div
        className="game-fit"
        style={
          {
            "--game-max": "360px",
            "--game-aspect": `${cols / rows}`,
            "--game-reserve": "150px",
          } as React.CSSProperties
        }
      >
        <div
          className="bg-surface panel-cyan grid gap-2 p-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cards.map((card, index) => {
            const open = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => flip(index)}
                aria-label={open ? `Carta ${card.icon.label}` : "Carta virada para baixo"}
                className={cn(
                  "relative grid aspect-square place-items-center overflow-hidden text-xl transition-transform active:scale-95",
                  open
                    ? card.matched
                      ? "bg-neon-green/15 pixel-border-cyan"
                      : "bg-surface-2 pixel-border-magenta"
                    : "bg-surface-2 pixel-border text-muted-foreground",
                )}
              >
                {open ? (
                  <img
                    src={card.icon.url}
                    alt={card.icon.label}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="glow-cyan text-accent">
                    ?
                  </span>
                )}
              </button>

            );
          })}
        </div>
      </div>
      <p className="ui-label text-muted-foreground text-center text-[11px]">
        PARES {matched}/{pairs} · JOGADAS {moves}
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
