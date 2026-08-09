import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsDown } from "lucide-react";
import { useGameStore } from "@/stores/game-store";
import type { Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

const DEAD_ZONE = 0.34;
const REPEAT_MS = 120;

/**
 * Controle exclusivo do Tetris: um analógico central com o botão A no meio
 * (toque no centro gira a peça) e o botão de descida rápida ao lado.
 */
export function TetrisPad({ className }: { className?: string }) {
  const pressDirection = useGameStore((s) => s.pressDirection);
  const pressAction = useGameStore((s) => s.pressAction);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const dirRef = useRef<Direction | null>(null);
  const movedRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (dirRef.current) pressDirection(dirRef.current);
    }, REPEAT_MS);
    return () => clearInterval(timer);
  }, [active, pressDirection]);

  const track = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const radius = rect.width / 2;
      let dx = (clientX - (rect.left + radius)) / radius;
      let dy = (clientY - (rect.top + radius)) / radius;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      setKnob({ x: dx * (radius - 30), y: dy * (radius - 30) });

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        dirRef.current = null;
        return;
      }
      movedRef.current = true;
      const next: Direction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      if (next !== dirRef.current) {
        dirRef.current = next;
        pressDirection(next);
      }
    },
    [pressDirection],
  );

  const release = () => {
    // Toque curto no centro, sem arrastar: vale como botão A (girar a peça).
    if (!movedRef.current) pressAction("a");
    dirRef.current = null;
    movedRef.current = false;
    setActive(false);
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "border-foreground/10 bg-surface/35 flex w-full touch-none items-center justify-center gap-4 rounded-3xl border p-3 backdrop-blur-xl select-none sm:gap-6 sm:p-4",
        className,
      )}
    >
      <div
        ref={baseRef}
        role="application"
        aria-label="Analógico do Tetris (centro gira a peça)"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          movedRef.current = false;
          setActive(true);
          track(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!active) return;
          event.preventDefault();
          track(event.clientX, event.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        className="border-accent/35 bg-surface/40 relative h-28 w-28 shrink-0 touch-none rounded-full border shadow-[0_0_36px_-14px_var(--neon-cyan)] select-none sm:h-32 sm:w-32"
      >
        <span
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          className={cn(
            "border-primary/60 bg-surface-2/85 text-primary absolute top-1/2 left-1/2 grid h-14 w-14 place-items-center rounded-full border text-xs font-bold tracking-wide backdrop-blur transition-transform",
            active
              ? "shadow-[0_0_28px_-6px_var(--neon-magenta)] scale-95"
              : "shadow-[0_0_24px_-10px_var(--neon-magenta)] duration-150",
          )}
        >
          A
        </span>
      </div>

      <button
        type="button"
        aria-label="Descer rápido"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          pressAction("b");
        }}
        className="border-accent/50 text-accent bg-surface/40 grid h-16 w-16 shrink-0 touch-none place-items-center rounded-full border backdrop-blur transition-transform select-none active:scale-95 sm:h-18 sm:w-18"
      >
        <ChevronsDown className="h-6 w-6" strokeWidth={1.4} />
      </button>
    </div>
  );
}
