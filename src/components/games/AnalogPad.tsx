import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import type { ActionButton, Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

function ActBtn({
  action,
  label,
  compact,
}: {
  action: ActionButton;
  label: string;
  compact?: boolean | undefined;
}) {
  const pressAction = useGameStore((s) => s.pressAction);
  return (
    <button
      type="button"
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        pressAction(action);
      }}
      className={cn(
        "bg-surface/40 grid shrink-0 touch-none place-items-center rounded-full border text-xs font-bold tracking-wide backdrop-blur transition-transform select-none active:scale-95",
        compact ? "h-10 w-10 sm:h-11 sm:w-11" : "h-12 w-12 sm:h-14 sm:w-14",
        action === "a"
          ? "border-primary/50 text-primary shadow-[0_0_24px_-10px_var(--neon-magenta)]"
          : "border-accent/50 text-accent shadow-[0_0_24px_-10px_var(--neon-cyan)]",
      )}
    >
      {label}
    </button>
  );
}

const DEAD_ZONE = 0.42;
/** Abaixo disso a direção atual é solta (histerese contra movimentos involuntários). */
const RELEASE_ZONE = 0.3;
/** Vantagem mínima de um eixo sobre o outro para trocar de direção. */
const AXIS_BIAS = 1.3;
const REPEAT_MS = 130;

/** Alavanca analógica virtual: arraste o polegar para emitir direções continuamente. */
export function AnalogPad({ className, compact, noActions }: { className?: string; compact?: boolean; noActions?: boolean }) {
  const pressDirection = useGameStore((s) => s.pressDirection);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const dirRef = useRef<Direction | null>(null);
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
      setKnob({ x: dx * (radius - 22), y: dy * (radius - 22) });

      const mag = Math.hypot(dx, dy);
      const current = dirRef.current;
      // Histerese: só solta abaixo da zona de liberação; só engata acima da zona morta.
      if (mag < RELEASE_ZONE || (!current && mag < DEAD_ZONE)) {
        dirRef.current = null;
        return;
      }
      if (current && mag < DEAD_ZONE) return;

      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const horizontal = ax > ay;
      const currentHorizontal = current === "left" || current === "right";
      // Diagonais não trocam de eixo sem dominância clara: evita curvas involuntárias.
      if (current && currentHorizontal !== horizontal) {
        const dominant = horizontal ? ax : ay;
        const other = horizontal ? ay : ax;
        if (dominant < other * AXIS_BIAS) return;
      }
      const next: Direction = horizontal ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      if (next !== current) {
        dirRef.current = next;
        pressDirection(next);
      }
    },
    [pressDirection],
  );

  const release = () => {
    dirRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "border-foreground/10 bg-surface/35 flex w-full touch-none items-center rounded-3xl border backdrop-blur-xl select-none",
        noActions ? "justify-center" : "justify-between gap-3",
        compact ? "p-2.5 sm:p-3" : "p-4 sm:gap-6 sm:p-5",
        className,
      )}
    >
      <div
        ref={baseRef}
        role="application"
        aria-label="Alavanca analógica"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
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
        className={cn(
          "border-accent/35 bg-surface/40 relative shrink-0 touch-none rounded-full border shadow-[0_0_36px_-14px_var(--neon-cyan)] select-none",
          compact ? "h-24 w-24 sm:h-28 sm:w-28" : "h-32 w-32 sm:h-36 sm:w-36",
        )}
      >

        <span
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          className={cn(
            "border-accent/60 bg-surface-2/80 absolute top-1/2 left-1/2 rounded-full border backdrop-blur transition-transform",
            compact ? "h-11 w-11" : "h-14 w-14",
            active ? "shadow-[0_0_28px_-6px_var(--neon-cyan)]" : "duration-150",
          )}
        />
      </div>
      {!noActions ? (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ActBtn action="b" label="B" compact={compact} />
          <ActBtn action="a" label="A" compact={compact} />
        </div>
      ) : null}
    </div>
  );
}
