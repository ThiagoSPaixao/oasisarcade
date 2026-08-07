import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { GameOverlay } from "./GameOverlay";

const W = 320;
const H = 400;
const PADDLE_W = 62;
const PADDLE_H = 10;
const BALL = 8;
const COLS = 7;
const ROWS = 5;
const BRICK_W = W / COLS;
const BRICK_H = 16;
const COLORS = ["--neon-magenta", "--neon-yellow", "--neon-cyan", "--neon-green", "--chart-5"];

type Brick = { x: number; y: number; alive: boolean; color: string };

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function buildBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let r = 0; r < ROWS; r += 1)
    for (let c = 0; c < COLS; c += 1)
      bricks.push({ x: c * BRICK_W, y: 40 + r * (BRICK_H + 4), alive: true, color: COLORS[r % COLORS.length]! });
  return bricks;
}

export function BreakoutGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paddleRef = useRef(W / 2);
  const moveRef = useRef(0);
  const ballRef = useRef({ x: W / 2, y: H - 60, vx: 2.4, vy: -3.2 });
  const bricksRef = useRef<Brick[]>(buildBricks());
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = cssVar("--background", "#12101c");
    ctx.fillRect(0, 0, W, H);

    const rect = (x: number, y: number, w: number, h: number, colorVar: string) => {
      ctx.fillStyle = cssVar(colorVar, "#ff4fd8");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
    };

    bricksRef.current.forEach((brick) => {
      if (brick.alive) rect(brick.x + 1, brick.y, BRICK_W - 2, BRICK_H, brick.color);
    });
    rect(paddleRef.current - PADDLE_W / 2, H - 24, PADDLE_W, PADDLE_H, "--neon-cyan");
    const ball = ballRef.current;
    rect(ball.x - BALL / 2, ball.y - BALL / 2, BALL, BALL, "--foreground");
  }, []);

  const reset = useCallback(() => {
    paddleRef.current = W / 2;
    ballRef.current = { x: W / 2, y: H - 60, vx: 2.4, vy: -3.2 };
    bricksRef.current = buildBricks();
    livesRef.current = 3;
    scoreRef.current = 0;
    setScore(0);
    draw();
  }, [draw, setScore]);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const step = useCallback(() => {
    paddleRef.current = Math.max(
      PADDLE_W / 2,
      Math.min(W - PADDLE_W / 2, paddleRef.current + moveRef.current * 5.5),
    );

    const ball = ballRef.current;
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < BALL / 2 || ball.x > W - BALL / 2) {
      ball.vx *= -1;
      play("select");
    }
    if (ball.y < BALL / 2) {
      ball.vy *= -1;
      play("select");
    }

    if (
      ball.vy > 0 &&
      ball.y > H - 24 - BALL / 2 &&
      ball.y < H - 24 + PADDLE_H &&
      Math.abs(ball.x - paddleRef.current) < PADDLE_W / 2 + 2
    ) {
      ball.vy = -Math.abs(ball.vy);
      ball.vx += (ball.x - paddleRef.current) * 0.07;
      play("eat");
    }

    for (const brick of bricksRef.current) {
      if (!brick.alive) continue;
      if (ball.x > brick.x && ball.x < brick.x + BRICK_W && ball.y > brick.y && ball.y < brick.y + BRICK_H) {
        brick.alive = false;
        ball.vy *= -1;
        scoreRef.current += 15;
        setScore(scoreRef.current);
        play("match");
        break;
      }
    }

    if (!bricksRef.current.some((b) => b.alive)) {
      scoreRef.current += 200;
      setScore(scoreRef.current);
      bricksRef.current = buildBricks();
      ballRef.current = { x: W / 2, y: H - 60, vx: ball.vx * 1.08, vy: -Math.abs(ball.vy) * 1.08 };
      play("levelup");
    }

    if (ball.y > H + 20) {
      livesRef.current -= 1;
      play("miss");
      if (livesRef.current <= 0) {
        setStatus("over");
        play("gameover");
        onGameOver(scoreRef.current);
        return;
      }
      ballRef.current = { x: W / 2, y: H - 60, vx: 2.4, vy: -3.2 };
    }

    draw();
  }, [draw, onGameOver, play, setScore, setStatus]);

  useEffect(() => {
    if (status !== "running") return;
    const loop = () => {
      step();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, step]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(((rect.width * H) / W) * dpr);
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "a"].includes(key)) moveRef.current = -1;
      else if (["arrowright", "d"].includes(key)) moveRef.current = 1;
      else if (key === " " || key === "enter") {
        event.preventDefault();
        const current = useGameStore.getState().status;
        if (current === "paused") setStatus("running");
        else if (current !== "running") start();
        else setStatus("paused");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (["arrowleft", "a", "arrowright", "d"].includes(event.key.toLowerCase())) moveRef.current = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setStatus, start]);

  useEffect(() => {
    if (!directionInput) return;
    if (useGameStore.getState().status !== "running") return;
    if (directionInput.direction === "left") moveRef.current = -1;
    else if (directionInput.direction === "right") moveRef.current = 1;
    const timer = setTimeout(() => (moveRef.current = 0), 180);
    return () => clearTimeout(timer);
  }, [directionInput]);

  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a") {
      if (current === "paused") setStatus("running");
      else if (current !== "running") start();
    } else if (current === "running") setStatus("paused");
    else if (current === "paused") setStatus("running");
  }, [actionInput, setStatus, start]);

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <canvas
        ref={canvasRef}
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
      />
      <GameOverlay
        title="BREAKOUT"
        hint="Setas ou D-Pad movem a raquete · quebre todos os tijolos"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
