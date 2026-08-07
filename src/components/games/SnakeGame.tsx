import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import type { Direction } from "@/types/arcade";

const GRID = 20;
const BASE_SPEED = 160;
const MIN_SPEED = 70;
const BONUS_INTERVAL = 13000;
const BONUS_LIFE = 7000;

type Point = { x: number; y: number };

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function randomFree(snake: Point[], avoid?: Point | null): Point {
  let point: Point;
  do {
    point = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (
    snake.some((s) => s.x === point.x && s.y === point.y) ||
    (avoid && avoid.x === point.x && avoid.y === point.y)
  );
  return point;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function SnakeGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Direction>("right");
  const queuedDirRef = useRef<Direction | null>(null);
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const bonusRef = useRef<{ x: number; y: number; born: number } | null>(null);
  const nextBonusRef = useRef(0);
  const lastTickRef = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);
  const [, forceRender] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = canvas.width;
    const cell = size / GRID;

    ctx.fillStyle = cssVar("--background", "#12101c");
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = cssVar("--border", "#3a2f52");
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const center = (p: Point) => ({ cx: p.x * cell + cell / 2, cy: p.y * cell + cell / 2 });

    // Maçã
    const food = foodRef.current;
    const fc = center(food);
    ctx.save();
    ctx.shadowColor = cssVar("--neon-magenta", "#ff4fd8");
    ctx.shadowBlur = 14;
    ctx.fillStyle = cssVar("--neon-magenta", "#ff4fd8");
    ctx.beginPath();
    ctx.arc(fc.cx, fc.cy + cell * 0.05, cell * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = cssVar("--neon-green", "#7dff8a");
    ctx.lineWidth = Math.max(1.2, cell * 0.08);
    ctx.beginPath();
    ctx.moveTo(fc.cx, fc.cy - cell * 0.24);
    ctx.quadraticCurveTo(fc.cx + cell * 0.16, fc.cy - cell * 0.42, fc.cx + cell * 0.3, fc.cy - cell * 0.3);
    ctx.stroke();
    ctx.restore();

    // Fruta especial (pulsa e desaparece)
    const bonus = bonusRef.current;
    if (bonus) {
      const t = (performance.now() - bonus.born) / BONUS_LIFE;
      const pulse = 0.82 + Math.sin(performance.now() / 120) * 0.14;
      const bc = center(bonus);
      ctx.save();
      ctx.globalAlpha = t > 0.75 ? (Math.sin(performance.now() / 90) > 0 ? 1 : 0.25) : 1;
      ctx.fillStyle = cssVar("--neon-yellow", "#f6d945");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      const r = cell * 0.2 * pulse;
      ctx.beginPath();
      ctx.arc(bc.cx - cell * 0.13, bc.cy + cell * 0.1, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bc.cx + cell * 0.15, bc.cy + cell * 0.14, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = cssVar("--neon-green", "#7dff8a");
      ctx.lineWidth = Math.max(1.1, cell * 0.07);
      ctx.beginPath();
      ctx.moveTo(bc.cx - cell * 0.13, bc.cy + cell * 0.05);
      ctx.quadraticCurveTo(bc.cx + cell * 0.06, bc.cy - cell * 0.34, bc.cx + cell * 0.26, bc.cy - cell * 0.3);
      ctx.moveTo(bc.cx + cell * 0.15, bc.cy + cell * 0.08);
      ctx.quadraticCurveTo(bc.cx + cell * 0.2, bc.cy - cell * 0.24, bc.cx + cell * 0.26, bc.cy - cell * 0.3);
      ctx.stroke();
      ctx.restore();
    }

    // Cobra: corpo contínuo arredondado + cabeça com olhos e língua
    const snake = snakeRef.current;
    const green = cssVar("--neon-green", "#7dff8a");
    ctx.save();
    ctx.strokeStyle = green;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = green;
    ctx.shadowBlur = 12;
    if (snake.length > 1) {
      for (let i = 0; i < snake.length - 1; i += 1) {
        const a = center(snake[i]!);
        const b = center(snake[i + 1]!);
        const taper = 1 - (i / snake.length) * 0.55;
        ctx.lineWidth = Math.max(cell * 0.26, cell * 0.74 * taper);
        ctx.globalAlpha = 0.95 - (i / snake.length) * 0.25;
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Escamas
    ctx.shadowBlur = 0;
    ctx.fillStyle = cssVar("--neon-cyan", "#4ff0ff");
    snake.forEach((segment, index) => {
      if (index === 0 || index % 2) return;
      const c = center(segment);
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, cell * 0.14, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const head = center(snake[0]!);
    ctx.fillStyle = green;
    ctx.shadowColor = green;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(head.cx, head.cy, cell * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const d = DELTA[dirRef.current];
    const perp = { x: -d.y, y: -d.x };
    const eye = (sign: number) => {
      const ex = head.cx + d.x * cell * 0.16 + perp.x * sign * cell * 0.16;
      const ey = head.cy + d.y * cell * 0.16 + perp.y * sign * cell * 0.16;
      ctx.fillStyle = "#0d0b16";
      ctx.beginPath();
      ctx.arc(ex, ey, cell * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex - cell * 0.02, ey - cell * 0.02, cell * 0.04, 0, Math.PI * 2);
      ctx.fill();
    };
    eye(1);
    eye(-1);

    // Língua
    ctx.strokeStyle = cssVar("--neon-magenta", "#ff4fd8");
    ctx.lineWidth = Math.max(1, cell * 0.07);
    ctx.beginPath();
    ctx.moveTo(head.cx + d.x * cell * 0.4, head.cy + d.y * cell * 0.4);
    ctx.lineTo(head.cx + d.x * cell * 0.62, head.cy + d.y * cell * 0.62);
    ctx.stroke();
    ctx.restore();
  }, []);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "right";
    queuedDirRef.current = null;
    foodRef.current = randomFree(snakeRef.current);
    bonusRef.current = null;
    nextBonusRef.current = performance.now() + BONUS_INTERVAL;
    scoreRef.current = 0;
    lastTickRef.current = 0;
    setScore(0);
    draw();
  }, [draw, setScore]);

  const turn = useCallback((direction: Direction) => {
    if (OPPOSITE[direction] === dirRef.current) return;
    queuedDirRef.current = direction;
  }, []);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const step = useCallback(() => {
    if (queuedDirRef.current) {
      dirRef.current = queuedDirRef.current;
      queuedDirRef.current = null;
    }
    const delta = DELTA[dirRef.current];
    const snake = snakeRef.current;
    const head = { x: snake[0]!.x + delta.x, y: snake[0]!.y + delta.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      setStatus("over");
      play("gameover");
      onGameOver(scoreRef.current);
      return;
    }

    const next = [head, ...snake];
    const bonus = bonusRef.current;
    if (bonus && head.x === bonus.x && head.y === bonus.y) {
      scoreRef.current += 20;
      setScore(scoreRef.current);
      play("coin");
      bonusRef.current = null;
      nextBonusRef.current = performance.now() + BONUS_INTERVAL;
    } else if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      play("eat");
      foodRef.current = randomFree(next, bonusRef.current);
    } else {
      next.pop();
    }
    snakeRef.current = next;
  }, [onGameOver, play, setScore, setStatus]);

  // Game loop
  useEffect(() => {
    if (status !== "running") return;
    const loop = (time: number) => {
      // Fruta especial: aparece de tempos em tempos e desaparece sozinha
      const bonus = bonusRef.current;
      if (bonus && time - bonus.born > BONUS_LIFE) {
        bonusRef.current = null;
        nextBonusRef.current = time + BONUS_INTERVAL;
      } else if (!bonus && time > nextBonusRef.current) {
        const spot = randomFree(snakeRef.current, foodRef.current);
        bonusRef.current = { ...spot, born: time };
      }

      const speed = Math.max(MIN_SPEED, BASE_SPEED - Math.floor(scoreRef.current / 30) * 8);
      if (time - lastTickRef.current >= speed) {
        lastTickRef.current = time;
        step();
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, status, step]);

  // Canvas sizing + first paint
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.floor(rect.width * dpr);
      canvas.width = px;
      canvas.height = px;
      draw();
      forceRender((n) => n + 1);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
        W: "up",
        S: "down",
        A: "left",
        D: "right",
      };
      const direction = map[event.key];
      if (direction) {
        event.preventDefault();
        if (useGameStore.getState().status === "running") turn(direction);
        return;
      }
      if (event.key === " " || event.key === "p" || event.key === "P") {
        event.preventDefault();
        const current = useGameStore.getState().status;
        if (current === "running") setStatus("paused");
        else if (current === "paused") setStatus("running");
        return;
      }
      if (event.key === "Enter") {
        const current = useGameStore.getState().status;
        if (current === "idle" || current === "over") start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setStatus, start, turn]);

  // D-Pad directional input
  useEffect(() => {
    if (!directionInput) return;
    if (useGameStore.getState().status === "running") turn(directionInput.direction);
    else if (useGameStore.getState().status === "idle") start();
  }, [directionInput, start, turn]);

  // D-Pad A/B buttons
  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a") {
      if (current === "idle" || current === "over") start();
      else if (current === "paused") setStatus("running");
    } else if (actionInput.action === "b") {
      if (current === "running") setStatus("paused");
      else if (current === "paused") setStatus("running");
    }
  }, [actionInput, setStatus, start]);

  return (
    <div
      className="game-fit relative"
      style={
        { "--game-max": "520px", "--game-aspect": "1", "--game-reserve": "300px" } as React.CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        className="bg-background border-primary/50 block aspect-square w-full rounded-2xl border shadow-[0_0_44px_-18px_var(--neon-magenta)]"
      />
      {status !== "running" && (
        <div className="bg-background/80 absolute inset-0 flex rounded-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="ui-label glow-cyan text-accent text-sm sm:text-base">
            {status === "over" ? "GAME OVER" : status === "paused" ? "PAUSADO" : "SNAKE"}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {status === "paused"
              ? "Aperte B ou espaço para continuar"
              : "Frutas douradas valem o dobro — pegue antes de sumirem"}
          </p>
          <button
            type="button"
            onClick={() => (status === "paused" ? setStatus("running") : start())}
            className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-xs font-bold tracking-[0.14em] shadow-[0_0_26px_-8px_var(--neon-magenta)] transition-transform active:scale-95"
          >
            {status === "over" ? "JOGAR DE NOVO" : status === "paused" ? "CONTINUAR" : "INSERIR FICHA"}
          </button>
        </div>
      )}
    </div>
  );
}
