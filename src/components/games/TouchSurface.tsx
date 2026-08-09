import { useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import type { Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

/** Distância mínima (px) para o arraste virar uma direção. */
const SWIPE_THRESHOLD = 22;
/** Movimento máximo (px) e duração para o gesto contar como toque (botão A). */
const TAP_SLOP = 12;
const TAP_MS = 320;
/** Vantagem mínima de um eixo sobre o outro para trocar de direção. */
const AXIS_BIAS = 1.25;

/**
 * Camada invisível sobre a tela do jogo: arraste emite direções e toque simples
 * emite o botão A (iniciar/atirar/confirmar, conforme o jogo).
 */
export function TouchSurface({ className }: { className?: string }) {
  const pressDirection = useGameStore((s) => s.pressDirection);
  const pressAction = useGameStore((s) => s.pressAction);
  const origin = useRef<{ x: number; y: number; t: number } | null>(null);
  const anchor = useRef({ x: 0, y: 0 });
  const lastDir = useRef<Direction | null>(null);
  const moved = useRef(false);

  const start = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { x: event.clientX, y: event.clientY, t: Date.now() };
    anchor.current = { x: event.clientX, y: event.clientY };
    lastDir.current = null;
    moved.current = false;
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    event.preventDefault();
    const dx = event.clientX - anchor.current.x;
    const dy = event.clientY - anchor.current.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;

    const horizontal = ax > ay;
    const current = lastDir.current;
    const currentHorizontal = current === "left" || current === "right";
    // Evita trocas involuntárias de eixo em arrastes diagonais.
    if (current && currentHorizontal !== horizontal) {
      const dominant = horizontal ? ax : ay;
      const other = horizontal ? ay : ax;
      if (dominant < other * AXIS_BIAS) return;
    }
    const next: Direction = horizontal ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    lastDir.current = next;
    moved.current = true;
    anchor.current = { x: event.clientX, y: event.clientY };
    pressDirection(next);
  };

  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    const from = origin.current;
    origin.current = null;
    if (!from) return;
    const dist = Math.hypot(event.clientX - from.x, event.clientY - from.y);
    if (!moved.current && dist < TAP_SLOP && Date.now() - from.t < TAP_MS) pressAction("a");
    lastDir.current = null;
    moved.current = false;
  };

  return (
    <div
      aria-hidden
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className={cn("absolute inset-0 z-10 touch-none select-none", className)}
    />
  );
}
