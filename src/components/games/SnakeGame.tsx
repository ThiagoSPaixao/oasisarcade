import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import type { Direction } from "@/types/arcade";

const GRID = 20;
const BASE_SPEED = 160;
const MIN_SPEED = 70;

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

function randomFood(snake: Point[]): Point {
  let point: Point;
  do {
    point = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === point.x && s.y === point.y));
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
    ctx.globalAlpha = 0.35;
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

    const food = foodRef.current;
    ctx.fillStyle = cssVar("--neon-yellow", "#f6d945");
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);

    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      ctx.fillStyle =
        index === 0 ? cssVar("--neon-magenta", "#ff4fd8") : cssVar("--neon-green", "#4dff9f");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = index === 0 ? 14 : 6;
      ctx.fillRect(segment.x * cell + 1, segment.y * cell + 1, cell - 2, cell - 2);
    });
    ctx.shadowBlur = 0;
  }, []);

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "right";
    queuedDirRef.current = null;
    foodRef.current = randomFood(snakeRef.current);
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
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      play("eat");
      foodRef.current = randomFood(next);
    } else {
      next.pop();
    }
    snakeRef.current = next;
    draw();
  }, [draw, onGameOver, play, setScore, setStatus]);

  // Game loop
  useEffect(() => {
    if (status !== "running") return;
    const loop = (time: number) => {
      const speed = Math.max(MIN_SPEED, BASE_SPEED - Math.floor(scoreRef.current / 30) * 8);
      if (time - lastTickRef.current >= speed) {
        lastTickRef.current = time;
        step();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, step]);

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
    <div className="relative w-full max-w-[520px]">
      <canvas
        ref={canvasRef}
        className="bg-background pixel-border-magenta block aspect-square w-full"
        style={{ imageRendering: "pixelated" }}
      />
      {status !== "running" && (
        <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="ui-label glow-cyan text-accent text-sm sm:text-base">
            {status === "over" ? "GAME OVER" : status === "paused" ? "PAUSADO" : "SNAKE"}
          </p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {status === "paused"
              ? "Aperte B ou espaço para continuar"
              : "Setas / WASD no teclado ou use o D-Pad"}
          </p>
          <button
            type="button"
            onClick={() => (status === "paused" ? setStatus("running") : start())}
            className="ui-label bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm transition-transform active:scale-95"
          >
            {status === "over" ? "JOGAR DE NOVO" : status === "paused" ? "CONTINUAR" : "INSERIR FICHA"}
          </button>
        </div>
      )}
    </div>
  );
}
