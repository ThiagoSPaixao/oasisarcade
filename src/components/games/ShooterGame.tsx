import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { GameOverlay } from "./GameOverlay";

const W = 300;
const H = 400;
const PLAYER_W = 24;
const PLAYER_H = 18;

type Bullet = { x: number; y: number };
type Enemy = { x: number; y: number; alive: boolean };
type Boom = { x: number; y: number; life: number };

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function buildWave(level: number): Enemy[] {
  const rows = Math.min(4, 2 + Math.floor(level / 2));
  const cols = 6;
  const enemies: Enemy[] = [];
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1)
      enemies.push({ x: 28 + c * 42, y: 30 + r * 34, alive: true });
  return enemies;
}

export function ShooterGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef(W / 2);
  const moveRef = useRef(0);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>(buildWave(1));
  const dirRef = useRef(1);
  const levelRef = useRef(1);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const boomsRef = useRef<Boom[]>([]);
  const lastShotRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [lives, setLives] = useState(3);

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

    // estrelas
    ctx.fillStyle = cssVar("--muted-foreground", "#8b83a8");
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 97) % W;
      const y = (i * 53 + Math.floor(performance.now() / 30)) % H;
      ctx.fillRect(x, y, 2, 2);
    }

    const rect = (x: number, y: number, w: number, h: number, colorVar: string, glow = 8) => {
      ctx.fillStyle = cssVar(colorVar, "#ff4fd8");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = glow;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
    };

    // nave
    const px = playerRef.current;
    rect(px - PLAYER_W / 2, H - 30, PLAYER_W, PLAYER_H, "--neon-cyan", 12);
    rect(px - 3, H - 38, 6, 8, "--neon-cyan", 12);

    enemiesRef.current.forEach((enemy) => {
      if (!enemy.alive) return;
      rect(enemy.x - 12, enemy.y - 8, 24, 16, "--neon-magenta", 10);
      rect(enemy.x - 6, enemy.y - 12, 12, 6, "--primary", 8);
    });

    bulletsRef.current.forEach((b) => rect(b.x - 1.5, b.y, 3, 10, "--neon-yellow", 10));
    enemyBulletsRef.current.forEach((b) => rect(b.x - 1.5, b.y, 3, 8, "--destructive", 8));

    boomsRef.current.forEach((boom) => {
      ctx.globalAlpha = boom.life / 12;
      rect(boom.x - 10, boom.y - 10, 20, 20, "--neon-yellow", 16);
      ctx.globalAlpha = 1;
    });
  }, []);

  const reset = useCallback(() => {
    playerRef.current = W / 2;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    enemiesRef.current = buildWave(1);
    boomsRef.current = [];
    dirRef.current = 1;
    levelRef.current = 1;
    livesRef.current = 3;
    scoreRef.current = 0;
    setLives(3);
    setScore(0);
    draw();
  }, [draw, setScore]);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const shoot = useCallback(() => {
    const now = performance.now();
    if (now - lastShotRef.current < 240) return;
    lastShotRef.current = now;
    bulletsRef.current.push({ x: playerRef.current, y: H - 40 });
    play("laser");
  }, [play]);

  const step = useCallback(() => {
    playerRef.current = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, playerRef.current + moveRef.current * 4.5));

    bulletsRef.current = bulletsRef.current.map((b) => ({ ...b, y: b.y - 7 })).filter((b) => b.y > -10);
    enemyBulletsRef.current = enemyBulletsRef.current
      .map((b) => ({ ...b, y: b.y + 3.4 }))
      .filter((b) => b.y < H + 10);
    boomsRef.current = boomsRef.current.map((b) => ({ ...b, life: b.life - 1 })).filter((b) => b.life > 0);

    // movimento da frota
    const alive = enemiesRef.current.filter((e) => e.alive);
    const speed = 0.5 + levelRef.current * 0.22;
    const maxX = Math.max(...alive.map((e) => e.x), 0);
    const minX = Math.min(...alive.map((e) => e.x), W);
    if ((dirRef.current > 0 && maxX > W - 18) || (dirRef.current < 0 && minX < 18)) {
      dirRef.current *= -1;
      enemiesRef.current.forEach((e) => (e.y += 14));
    }
    enemiesRef.current.forEach((e) => (e.x += dirRef.current * speed));

    if (alive.length && Math.random() < 0.02 + levelRef.current * 0.005) {
      const shooter = alive[Math.floor(Math.random() * alive.length)]!;
      enemyBulletsRef.current.push({ x: shooter.x, y: shooter.y + 10 });
    }

    // tiros do jogador x inimigos
    bulletsRef.current = bulletsRef.current.filter((bullet) => {
      const hit = enemiesRef.current.find(
        (e) => e.alive && Math.abs(e.x - bullet.x) < 14 && Math.abs(e.y - bullet.y) < 12,
      );
      if (!hit) return true;
      hit.alive = false;
      boomsRef.current.push({ x: hit.x, y: hit.y, life: 12 });
      scoreRef.current += 20;
      setScore(scoreRef.current);
      play("explosion");
      return false;
    });

    const px = playerRef.current;
    const playerHit = enemyBulletsRef.current.find(
      (b) => Math.abs(b.x - px) < PLAYER_W / 2 && b.y > H - 34 && b.y < H - 8,
    );
    const reachedBottom = enemiesRef.current.some((e) => e.alive && e.y > H - 46);
    if (playerHit || reachedBottom) {
      enemyBulletsRef.current = [];
      livesRef.current -= 1;
      setLives(livesRef.current);
      boomsRef.current.push({ x: px, y: H - 24, life: 12 });
      play("explosion");
      if (reachedBottom) enemiesRef.current = buildWave(levelRef.current);
      if (livesRef.current <= 0) {
        setStatus("over");
        play("gameover");
        onGameOver(scoreRef.current);
        return;
      }
    }

    if (!enemiesRef.current.some((e) => e.alive)) {
      levelRef.current += 1;
      scoreRef.current += 100;
      setScore(scoreRef.current);
      enemiesRef.current = buildWave(levelRef.current);
      play("levelup");
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
      else if (key === " ") {
        event.preventDefault();
        const current = useGameStore.getState().status;
        if (current === "running") shoot();
        else if (current === "paused") setStatus("running");
        else start();
      } else if (key === "p") {
        const current = useGameStore.getState().status;
        if (current === "running") setStatus("paused");
        else if (current === "paused") setStatus("running");
      } else if (key === "enter") {
        if (useGameStore.getState().status !== "running") start();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "a", "arrowright", "d"].includes(key)) moveRef.current = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setStatus, shoot, start]);

  // D-Pad: um toque move a nave por um instante (mobile)
  useEffect(() => {
    if (!directionInput) return;
    if (useGameStore.getState().status !== "running") return;
    const { direction } = directionInput;
    if (direction === "left") moveRef.current = -1;
    else if (direction === "right") moveRef.current = 1;
    else if (direction === "up") shoot();
    const timer = setTimeout(() => (moveRef.current = 0), 180);
    return () => clearTimeout(timer);
  }, [directionInput, shoot]);

  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a") {
      if (current === "running") shoot();
      else if (current === "paused") setStatus("running");
      else start();
    } else if (current === "running") setStatus("paused");
    else if (current === "paused") setStatus("running");
  }, [actionInput, setStatus, shoot, start]);

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <canvas
        ref={canvasRef}
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
      />
      <p className="ui-label text-muted-foreground mt-2 text-center text-[11px]">
        VIDAS {"❤".repeat(Math.max(0, lives))}
      </p>
      <GameOverlay
        title="SPACE SHOOTER"
        hint="Setas movem · A ou espaço atira · segure para desviar"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
