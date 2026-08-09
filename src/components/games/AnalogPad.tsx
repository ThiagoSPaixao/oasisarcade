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

const DEAD_ZONE = 0.32;
const REPEAT_MS = 130;

/** Alavanca analógica virtual: arraste o polegar para emitir direções continuamente. */
export function AnalogPad({ className, compact }: { className?: string; compact?: boolean }) {
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

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        dirRef.current = null;
        return;
      }
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
    dirRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "border-foreground/10 bg-surface/35 flex w-full touch-none items-center justify-between gap-3 rounded-3xl border backdrop-blur-xl select-none",
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
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ActBtn action="b" label="B" compact={compact} />
        <ActBtn action="a" label="A" compact={compact} />
      </div>
    </div>
  );
}
