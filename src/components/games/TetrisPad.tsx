import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, RotateCw } from "lucide-react";
import { useGameStore } from "@/stores/game-store";
import type { ControlMode } from "@/stores/settings-store";
import type { Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

const DEAD_ZONE = 0.34;
const REPEAT_MS = 120;

/** Botão direcional com auto-repetição enquanto o dedo fica pressionado. */
function DirButton({ direction, children }: { direction: Direction; children: React.ReactNode }) {
  const pressDirection = useGameStore((s) => s.pressDirection);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  return (
    <button
      type="button"
      aria-label={direction}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pressDirection(direction);
        stop();
        timerRef.current = window.setInterval(() => pressDirection(direction), REPEAT_MS);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      className="border-accent/35 text-accent bg-surface/40 hover:border-accent/60 grid h-11 w-11 shrink-0 touch-none place-items-center rounded-full border backdrop-blur transition-all select-none active:scale-95 sm:h-13 sm:w-13"
    >
      {children}
    </button>
  );
}

/** Botões de ação do Tetris: girar (seta circular) e descida rápida (setas duplas). */
function TetrisActions() {
  const pressAction = useGameStore((s) => s.pressAction);
  const base =
    "bg-surface/40 grid h-14 w-14 shrink-0 touch-none place-items-center gap-0.5 rounded-full border backdrop-blur transition-transform select-none active:scale-95 sm:h-16 sm:w-16";
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button
        type="button"
        aria-label="Descer rápido"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          pressAction("b");
        }}
        className={cn(base, "border-accent/50 text-accent shadow-[0_0_24px_-10px_var(--neon-cyan)]")}
      >
        <ChevronsDown className="h-6 w-6" strokeWidth={1.6} />
        <span className="ui-label text-[7px] tracking-widest">DESCER</span>
      </button>
      <button
        type="button"
        aria-label="Girar peça"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          pressAction("a");
        }}
        className={cn(
          base,
          "border-primary/50 text-primary shadow-[0_0_24px_-10px_var(--neon-magenta)]",
        )}
      >
        <RotateCw className="h-6 w-6" strokeWidth={1.6} />
        <span className="ui-label text-[7px] tracking-widest">GIRAR</span>
      </button>
    </div>
  );
}

/** Base analógica (apenas direção — as ações ficam nos botões ao lado). */
function TetrisAnalog() {
  const pressDirection = useGameStore((s) => s.pressDirection);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const dirRef = useRef<Direction | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (dirRef.current) pressDirection(dirRef.current);
    }, REPEAT_MS);
    return () => window.clearInterval(timer);
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
      ref={baseRef}
      role="application"
      aria-label="Analógico do Tetris"
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
      className="border-accent/35 bg-surface/40 relative h-28 w-28 shrink-0 touch-none rounded-full border shadow-[0_0_36px_-14px_var(--neon-cyan)] select-none sm:h-32 sm:w-32"
    >
      <span
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        className={cn(
          "border-accent/60 bg-surface-2/85 absolute top-1/2 left-1/2 h-14 w-14 rounded-full border backdrop-blur transition-transform",
          active
            ? "scale-95 shadow-[0_0_28px_-6px_var(--neon-cyan)]"
            : "shadow-[0_0_24px_-10px_var(--neon-cyan)] duration-150",
        )}
      />
    </div>
  );
}

/**
 * Controle do Tetris: setas direcionais (padrão) ou analógico, sempre com os
 * botões GIRAR (seta circular) e DESCER RÁPIDO (setas duplas) ao lado.
 */
export function TetrisPad({
  className,
  mode = "dpad",
}: {
  className?: string;
  mode?: ControlMode;
}) {
  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "border-foreground/10 bg-surface/35 flex w-full touch-none items-center justify-between gap-3 rounded-3xl border p-3 backdrop-blur-xl select-none sm:gap-5 sm:p-4",
        className,
      )}
    >
      {mode === "analog" ? (
        <TetrisAnalog />
      ) : (
        <div className="grid shrink-0 grid-cols-3 grid-rows-3 place-items-center gap-1 sm:gap-1.5">
          <span />
          <span />
          <span />
          <DirButton direction="left">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.2} />
          </DirButton>
          <span />
          <DirButton direction="right">
            <ChevronRight className="h-5 w-5" strokeWidth={1.2} />
          </DirButton>
          <span />
          <DirButton direction="down">
            <ChevronDown className="h-5 w-5" strokeWidth={1.2} />
          </DirButton>
          <span />
        </div>
      )}

      <TetrisActions />
    </div>
  );
}
