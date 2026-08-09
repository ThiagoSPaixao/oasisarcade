import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { useGameOptions } from "@/stores/settings-store";
import { DIFFICULTY_META, gain } from "@/lib/game-options";
import { GameOverlay } from "./GameOverlay";

const W = 320;
const H = 400;
const SHIP_W = 24;
const SHIP_H = 12;
const COLS = 7;
const ROWS = 4;
const INV_W = 20;
const INV_H = 14;
const GAP_X = 12;
const GAP_Y = 10;
const SHIP_Y = H - 26;

type Invader = { x: number; y: number; alive: boolean; row: number };
type Shot = { x: number; y: number; vy: number };

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function buildWave(wave: number): Invader[] {
  const invaders: Invader[] = [];
  const totalW = COLS * INV_W + (COLS - 1) * GAP_X;
  const startX = (W - totalW) / 2;
  const startY = 44 + Math.min(3, wave - 1) * 8;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      invaders.push({
        x: startX + c * (INV_W + GAP_X),
        y: startY + r * (INV_H + GAP_Y),
        alive: true,
        row: r,
      });
    }
  }
  return invaders;
}

const ROW_COLORS = ["--neon-magenta", "--neon-yellow", "--neon-green", "--neon-cyan"];

export function SpaceInvadersGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shipRef = useRef(W / 2);
  const moveRef = useRef(0);
  const invadersRef = useRef<Invader[]>(buildWave(1));
  const dirRef = useRef(1);
  const shotsRef = useRef<Shot[]>([]);
  const enemyShotsRef = useRef<Shot[]>([]);
  const waveRef = useRef(1);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);

  // Configurações isoladas do Space Invaders (mesma arquitetura dos outros jogos).
  const options = useGameOptions("space-invaders");
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

    const rect = (x: number, y: number, w: number, h: number, colorVar: string) => {
      ctx.fillStyle = cssVar(colorVar, "#ff4fd8");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
    };

    // Invasores em formação (blocos pixelados com "antenas").
    for (const inv of invadersRef.current) {
      if (!inv.alive) continue;
      const color = ROW_COLORS[inv.row % ROW_COLORS.length]!;
      rect(inv.x, inv.y + 3, INV_W, INV_H - 5, color);
      rect(inv.x + 2, inv.y, 4, 4, color);
      rect(inv.x + INV_W - 6, inv.y, 4, 4, color);
    }

    // Nave do jogador.
    const sx = shipRef.current;
    rect(sx - SHIP_W / 2, SHIP_Y, SHIP_W, SHIP_H, "--neon-cyan");
    rect(sx - 2, SHIP_Y - 5, 4, 5, "--neon-cyan");

    for (const shot of shotsRef.current) rect(shot.x - 1.5, shot.y, 3, 8, "--foreground");
    for (const shot of enemyShotsRef.current) rect(shot.x - 1.5, shot.y, 3, 8, "--neon-magenta");

    // HUD: vidas e onda.
    ctx.fillStyle = cssVar("--muted-foreground", "#9aa0b5");
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`VIDAS ${livesRef.current}`, 8, 16);
    ctx.textAlign = "right";
    ctx.fillText(`ONDA ${waveRef.current}`, W - 8, 16);
  }, []);

  const reset = useCallback(() => {
    shipRef.current = W / 2;
    moveRef.current = 0;
    invadersRef.current = buildWave(1);
    dirRef.current = 1;
    shotsRef.current = [];
    enemyShotsRef.current = [];
    waveRef.current = 1;
    livesRef.current = 3;
    scoreRef.current = 0;
    cooldownRef.current = 0;
    setScore(0);
    draw();
  }, [draw, setScore]);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const shoot = useCallback(() => {
    if (useGameStore.getState().status !== "running") return;
    if (cooldownRef.current > 0 || shotsRef.current.length >= 2) return;
    shotsRef.current.push({ x: shipRef.current, y: SHIP_Y - 8, vy: -5.4 });
    cooldownRef.current = 12;
    play("select");
  }, [play]);

  const step = useCallback(() => {
    const f = speedRef.current;
    if (cooldownRef.current > 0) cooldownRef.current -= 1;

    shipRef.current = Math.max(
      SHIP_W / 2,
      Math.min(W - SHIP_W / 2, shipRef.current + moveRef.current * 4.2),
    );

    // Formação: anda de lado e desce ao bater na parede.
    const alive = invadersRef.current.filter((i) => i.alive);
    const total = ROWS * COLS;
    const pressure = 1 + (total - alive.length) / total;
    const speed = 0.42 * f * pressure * (1 + (waveRef.current - 1) * 0.16);
    let bump = false;
    for (const inv of alive) {
      inv.x += dirRef.current * speed;
      if (inv.x < 4 || inv.x + INV_W > W - 4) bump = true;
    }
    if (bump) {
      dirRef.current *= -1;
      for (const inv of alive) inv.y += 8;
    }

    // Tiros inimigos aleatórios.
    if (alive.length > 0 && Math.random() < 0.012 * f * (1 + (waveRef.current - 1) * 0.2)) {
      const shooter = alive[Math.floor(Math.random() * alive.length)]!;
      enemyShotsRef.current.push({ x: shooter.x + INV_W / 2, y: shooter.y + INV_H, vy: 2.6 * f });
    }

    // Tiros do jogador.
    shotsRef.current = shotsRef.current.filter((shot) => {
      shot.y += shot.vy;
      if (shot.y < -10) return false;
      for (const inv of invadersRef.current) {
        if (!inv.alive) continue;
        if (shot.x > inv.x && shot.x < inv.x + INV_W && shot.y > inv.y && shot.y < inv.y + INV_H) {
          inv.alive = false;
          scoreRef.current += gain(10 + (ROWS - inv.row) * 5, optionsRef.current.difficulty);
          setScore(scoreRef.current);
          play("match");
          return false;
        }
      }
      return true;
    });

    enemyShotsRef.current = enemyShotsRef.current.filter((shot) => {
      shot.y += shot.vy;
      if (shot.y > H + 10) return false;
      const hit =
        shot.y > SHIP_Y &&
        shot.y < SHIP_Y + SHIP_H &&
        Math.abs(shot.x - shipRef.current) < SHIP_W / 2;
      if (!hit) return true;
      livesRef.current -= 1;
      play("miss");
      if (livesRef.current <= 0) {
        setStatus("over");
        play("gameover");
        onGameOver(scoreRef.current);
      }
      return false;
    });

    // Onda derrotada ou invasores chegaram na base.
    if (alive.length === 0) {
      waveRef.current += 1;
      scoreRef.current += gain(120, optionsRef.current.difficulty);
      setScore(scoreRef.current);
      invadersRef.current = buildWave(waveRef.current);
      enemyShotsRef.current = [];
      shotsRef.current = [];
      dirRef.current = 1;
      play("levelup");
    } else if (alive.some((inv) => inv.y + INV_H >= SHIP_Y)) {
      setStatus("over");
      play("gameover");
      onGameOver(scoreRef.current);
      return;
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
        if (current === "running") shoot();
        else if (current === "paused") setStatus("running");
        else start();
      } else if (key === "p") {
        const current = useGameStore.getState().status;
        if (current === "running") setStatus("paused");
        else if (current === "paused") setStatus("running");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (["arrowleft", "a", "arrowright", "d"].includes(event.key.toLowerCase()))
        moveRef.current = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setStatus, shoot, start]);

  useEffect(() => {
    if (!directionInput) return;
    if (useGameStore.getState().status !== "running") return;
    if (directionInput.direction === "left") moveRef.current = -1;
    else if (directionInput.direction === "right") moveRef.current = 1;
    const timer = setTimeout(() => (moveRef.current = 0), 200);
    return () => clearTimeout(timer);
  }, [directionInput]);

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

  // Trocar a dificuldade reinicia a partida.
  useEffect(() => {
    reset();
    setStatus("idle");
  }, [options.difficulty, reset, setStatus]);

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
        role="img"
        aria-label="Área de jogo do Space Invaders"
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
      />
      <GameOverlay
        title="SPACE INVADERS"
        hint="← → movem a nave · A (ou espaço) atira · B pausa"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
