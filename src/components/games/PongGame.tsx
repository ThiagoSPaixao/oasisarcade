import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { useGameOptions } from "@/stores/settings-store";
import { DIFFICULTY_META, gain } from "@/lib/game-options";
import { GameOverlay } from "./GameOverlay";

const W = 320;
const H = 400;
const PADDLE_W = 58;
const PADDLE_H = 10;
const BALL = 8;

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function PongGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef(W / 2);
  const cpuRef = useRef(W / 2);
  const moveRef = useRef(0);
  const ballRef = useRef({ x: W / 2, y: H / 2, vx: 2.6, vy: -3.2 });
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const rafRef = useRef<number | null>(null);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);

  // Configurações isoladas do Pong
  const options = useGameOptions("pong");
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const speedRef = useRef(DIFFICULTY_META[options.difficulty].speed);
  speedRef.current = DIFFICULTY_META[options.difficulty].speed;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = cssVar("--background", "#12101c");
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = cssVar("--border", "#3a2f52");
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const rect = (x: number, y: number, w: number, h: number, colorVar: string) => {
      ctx.fillStyle = cssVar(colorVar, "#ff4fd8");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
    };

    rect(playerRef.current - PADDLE_W / 2, H - 24, PADDLE_W, PADDLE_H, "--neon-cyan");
    rect(cpuRef.current - PADDLE_W / 2, 14, PADDLE_W, PADDLE_H, "--neon-magenta");
    const ball = ballRef.current;
    rect(ball.x - BALL / 2, ball.y - BALL / 2, BALL, BALL, "--neon-yellow");
  }, []);

  const serve = useCallback((toPlayer: boolean) => {
    ballRef.current = {
      x: W / 2,
      y: H / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 2.6,
      vy: toPlayer ? 3.2 : -3.2,
    };
  }, []);

  const reset = useCallback(() => {
    playerRef.current = W / 2;
    cpuRef.current = W / 2;
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    serve(true);
    draw();
  }, [draw, serve, setScore]);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const step = useCallback(() => {
    playerRef.current = Math.max(
      PADDLE_W / 2,
      Math.min(W - PADDLE_W / 2, playerRef.current + moveRef.current * 5),
    );

    const ball = ballRef.current;
    const cpuSpeed = 2 + Math.min(2.4, scoreRef.current / 60);
    cpuRef.current += Math.sign(ball.x - cpuRef.current) * cpuSpeed;
    cpuRef.current = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, cpuRef.current));

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < BALL / 2 || ball.x > W - BALL / 2) {
      ball.vx *= -1;
      play("select");
    }

    // raquete do jogador
    if (ball.vy > 0 && ball.y > H - 24 - BALL / 2 && ball.y < H - 24 + PADDLE_H && Math.abs(ball.x - playerRef.current) < PADDLE_W / 2 + 2) {
      ball.vy = -Math.abs(ball.vy) * 1.03;
      ball.vx += (ball.x - playerRef.current) * 0.06;
      scoreRef.current += 10;
      setScore(scoreRef.current);
      play("eat");
    }

    // raquete da CPU
    if (ball.vy < 0 && ball.y < 24 + BALL / 2 && ball.y > 14 - BALL && Math.abs(ball.x - cpuRef.current) < PADDLE_W / 2 + 2) {
      ball.vy = Math.abs(ball.vy) * 1.03;
      ball.vx += (ball.x - cpuRef.current) * 0.06;
      play("rotate");
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
      serve(true);
    } else if (ball.y < -20) {
      scoreRef.current += 50;
      setScore(scoreRef.current);
      play("coin");
      serve(false);
    }

    draw();
  }, [draw, onGameOver, play, serve, setScore, setStatus]);

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
    <div
      className="game-fit relative"
      style={
        {
          "--game-max": "360px",
          "--game-aspect": `${W / H}`,
          "--game-reserve": "300px",
        } as React.CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
      />
      <GameOverlay
        title="PONG"
        hint="Setas ou D-Pad movem sua raquete · não deixe a bola passar"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
