import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { useGameOptions } from "@/stores/settings-store";
import { DIFFICULTY_META, gain } from "@/lib/game-options";
import type { Direction } from "@/types/arcade";

const GRID = 20;
const BASE_SPEED = 160;
const MIN_SPEED = 70;
const BONUS_INTERVAL = 13000;
const BONUS_LIFE = 7000;
const FRAME_MS = 1000 / 60;
const MAX_FRAME_DELTA = 80;
const MAX_PARTICLES = 40;

type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

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

type Palette = {
  bg: string;
  border: string;
  magenta: string;
  green: string;
  cyan: string;
  yellow: string;
};

function readPalette(): Palette {
  const read = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    bg: read("--background", "#12101c"),
    border: read("--border", "#3a2f52"),
    magenta: read("--neon-magenta", "#ff4fd8"),
    green: read("--neon-green", "#7dff8a"),
    cyan: read("--neon-cyan", "#4ff0ff"),
    yellow: read("--neon-yellow", "#f6d945"),
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function SnakeGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const prevSnakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Direction>("right");
  const queuedDirRef = useRef<Direction | null>(null);
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const bonusRef = useRef<{ x: number; y: number; born: number } | null>(null);
  const nextBonusRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastFrameRef = useRef(0);
  const accumulatorRef = useRef(0);
  const tickSpeedRef = useRef(BASE_SPEED);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  // Cache: cores lidas uma vez e grade pré-renderizada = muito menos trabalho por frame.
  const paletteRef = useRef<Palette>({
    bg: "#12101c",
    border: "#3a2f52",
    magenta: "#ff4fd8",
    green: "#7dff8a",
    cyan: "#4ff0ff",
    yellow: "#f6d945",
  });
  const gridLayerRef = useRef<HTMLCanvasElement | null>(null);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);

  // Configurações isoladas do Snake
  const options = useGameOptions("snake");
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const speedFactor = DIFFICULTY_META[options.difficulty].speed;
  const speedRef = useRef(speedFactor);
  speedRef.current = speedFactor;


  const buildGridLayer = useCallback((size: number) => {
    const layer = gridLayerRef.current ?? document.createElement("canvas");
    gridLayerRef.current = layer;
    layer.width = size;
    layer.height = size;
    const g = layer.getContext("2d");
    if (!g) return;
    const p = paletteRef.current;
    const cell = size / GRID;
    g.clearRect(0, 0, size, size);
    g.fillStyle = p.bg;
    g.fillRect(0, 0, size, size);
    // Vinheta sutil
    const vg = g.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.72);
    vg.addColorStop(0, "rgba(255,255,255,0.04)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = vg;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = p.border;
    g.globalAlpha = 0.18;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < GRID; i += 1) {
      g.moveTo(i * cell, 0);
      g.lineTo(i * cell, size);
      g.moveTo(0, i * cell);
      g.lineTo(size, i * cell);
    }
    g.stroke();
    g.globalAlpha = 1;
  }, []);

  const spawnParticles = useCallback((cell: number, cx: number, cy: number, color: string, count: number) => {
    const available = Math.max(0, MAX_PARTICLES - particlesRef.current.length);
    for (let i = 0; i < Math.min(count, available); i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = cell * (0.04 + Math.random() * 0.09);
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }, []);

  const draw = useCallback(
    (time: number, frameDelta = FRAME_MS, progress?: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const size = canvas.width;
      const cell = size / GRID;
      const p = paletteRef.current;

      const grid = gridLayerRef.current;
      if (grid && grid.width === size) ctx.drawImage(grid, 0, 0);
      else {
        ctx.fillStyle = p.bg;
        ctx.fillRect(0, 0, size, size);
      }

      ctx.save();
      if (shakeRef.current > 0.01) {
        const s = shakeRef.current * cell * 0.35;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        shakeRef.current *= Math.pow(0.86, frameDelta / FRAME_MS);
      }

      const running = useGameStore.getState().status === "running";
      const t = running
        ? Math.min(1, progress ?? (time - lastTickRef.current) / Math.max(1, tickSpeedRef.current))
        : 1;

      const center = (px: number, py: number) => ({ cx: px * cell + cell / 2, cy: py * cell + cell / 2 });

      // Maçã (respira suavemente)
      const food = foodRef.current;
      const fc = center(food.x, food.y);
      const breathe = 1 + Math.sin(time / 260) * 0.08;
      ctx.save();
      ctx.shadowColor = p.magenta;
      ctx.shadowBlur = 16;
      ctx.fillStyle = p.magenta;
      ctx.beginPath();
      ctx.arc(fc.cx, fc.cy + cell * 0.05, cell * 0.32 * breathe, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(fc.cx - cell * 0.1, fc.cy - cell * 0.06, cell * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.green;
      ctx.lineWidth = Math.max(1.2, cell * 0.08);
      ctx.beginPath();
      ctx.moveTo(fc.cx, fc.cy - cell * 0.24);
      ctx.quadraticCurveTo(fc.cx + cell * 0.16, fc.cy - cell * 0.42, fc.cx + cell * 0.3, fc.cy - cell * 0.3);
      ctx.stroke();
      ctx.restore();

      // Fruta especial (pulsa e desaparece)
      const bonus = bonusRef.current;
      if (bonus) {
        const age = (time - bonus.born) / BONUS_LIFE;
        const pulse = 0.82 + Math.sin(time / 120) * 0.14;
        const bc = center(bonus.x, bonus.y);
        ctx.save();
        ctx.globalAlpha = age > 0.75 ? (Math.sin(time / 90) > 0 ? 1 : 0.25) : 1;
        ctx.fillStyle = p.yellow;
        ctx.shadowColor = p.yellow;
        ctx.shadowBlur = 20;
        const r = cell * 0.2 * pulse;
        ctx.beginPath();
        ctx.arc(bc.cx - cell * 0.13, bc.cy + cell * 0.1, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bc.cx + cell * 0.15, bc.cy + cell * 0.14, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = p.green;
        ctx.lineWidth = Math.max(1.1, cell * 0.07);
        ctx.beginPath();
        ctx.moveTo(bc.cx - cell * 0.13, bc.cy + cell * 0.05);
        ctx.quadraticCurveTo(bc.cx + cell * 0.06, bc.cy - cell * 0.34, bc.cx + cell * 0.26, bc.cy - cell * 0.3);
        ctx.moveTo(bc.cx + cell * 0.15, bc.cy + cell * 0.08);
        ctx.quadraticCurveTo(bc.cx + cell * 0.2, bc.cy - cell * 0.24, bc.cx + cell * 0.26, bc.cy - cell * 0.3);
        ctx.stroke();
        ctx.restore();
      }

      // Cobra interpolada: movimento fluido a 60fps entre os ticks lógicos
      const snake = snakeRef.current;
      const prev = prevSnakeRef.current;
      const pts: { cx: number; cy: number }[] = [];
      for (let i = 0; i < snake.length; i += 1) {
        const cur = snake[i]!;
        const old = prev[i] ?? prev[prev.length - 1] ?? cur;
        const wrapped = Math.abs(cur.x - old.x) > 1 || Math.abs(cur.y - old.y) > 1;
        const from = wrapped ? cur : old;
        pts.push({
          cx: lerp(from.x, cur.x, t) * cell + cell / 2,
          cy: lerp(from.y, cur.y, t) * cell + cell / 2,
        });
      }

      const strokeBody = (width: number, color: string, alpha: number) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(pts[0]!.cx, pts[0]!.cy);
        for (let i = 1; i < pts.length; i += 1) {
          const a = pts[i - 1]!;
          const b = pts[i]!;
          ctx.quadraticCurveTo(a.cx, a.cy, (a.cx + b.cx) / 2, (a.cy + b.cy) / 2);
        }
        ctx.lineTo(pts[pts.length - 1]!.cx, pts[pts.length - 1]!.cy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (pts.length > 1) {
        // halo (uma passada, sem shadowBlur = mais rápido)
        strokeBody(cell * 0.98, p.green, 0.16);
        strokeBody(cell * 0.74, p.green, 0.95);
        // brilho superior dá volume ao corpo
        strokeBody(cell * 0.3, "rgba(255,255,255,0.28)", 0.6);
      }

      // Escamas
      ctx.fillStyle = p.cyan;
      ctx.globalAlpha = 0.2;
      for (let i = 2; i < pts.length; i += 2) {
        const c = pts[i]!;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, cell * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Cabeça
      const head = pts[0]!;
      const d = DELTA[dirRef.current];
      const headGrad = ctx.createRadialGradient(
        head.cx - d.x * cell * 0.1,
        head.cy - d.y * cell * 0.1,
        cell * 0.05,
        head.cx,
        head.cy,
        cell * 0.46,
      );
      headGrad.addColorStop(0, "rgba(255,255,255,0.85)");
      headGrad.addColorStop(0.45, p.green);
      headGrad.addColorStop(1, p.green);
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(head.cx, head.cy, cell * 0.44, 0, Math.PI * 2);
      ctx.fill();

      const perp = { x: -d.y, y: -d.x };
      const blink = Math.sin(time / 900) > 0.985;
      const eye = (sign: number) => {
        const ex = head.cx + d.x * cell * 0.16 + perp.x * sign * cell * 0.16;
        const ey = head.cy + d.y * cell * 0.16 + perp.y * sign * cell * 0.16;
        ctx.fillStyle = "#0d0b16";
        ctx.beginPath();
        if (blink) {
          ctx.ellipse(ex, ey, cell * 0.1, cell * 0.02, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(ex, ey, cell * 0.1, 0, Math.PI * 2);
        }
        ctx.fill();
        if (blink) return;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - cell * 0.025, ey - cell * 0.025, cell * 0.04, 0, Math.PI * 2);
        ctx.fill();
      };
      eye(1);
      eye(-1);

      // Língua bifurcada que vibra
      const flick = Math.sin(time / 110) * 0.5 + 0.5;
      if (flick > 0.35) {
        const baseX = head.cx + d.x * cell * 0.42;
        const baseY = head.cy + d.y * cell * 0.42;
        const tipX = baseX + d.x * cell * 0.26 * flick;
        const tipY = baseY + d.y * cell * 0.26 * flick;
        ctx.strokeStyle = p.magenta;
        ctx.lineWidth = Math.max(1, cell * 0.06);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(tipX, tipY);
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + perp.x * cell * 0.1, tipY + perp.y * cell * 0.1);
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - perp.x * cell * 0.1, tipY - perp.y * cell * 0.1);
        ctx.stroke();
      }
      ctx.restore();

      // Partículas de comida
      const particles = particlesRef.current;
      if (particles.length) {
        const frameScale = Math.min(3, frameDelta / FRAME_MS);
        const damping = Math.pow(0.94, frameScale);
        for (let i = particles.length - 1; i >= 0; i -= 1) {
          const pt = particles[i]!;
          pt.x += pt.vx * frameScale;
          pt.y += pt.vy * frameScale;
          pt.vx *= damping;
          pt.vy *= damping;
          pt.life -= 0.035 * frameScale;
          if (pt.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = Math.max(0, pt.life);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, cell * 0.09 * pt.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    },
    [],
  );

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }];
    prevSnakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = "right";
    queuedDirRef.current = null;
    foodRef.current = randomFree(snakeRef.current);
    bonusRef.current = null;
    nextBonusRef.current = performance.now() + BONUS_INTERVAL;
    scoreRef.current = 0;
    const now = performance.now();
    lastTickRef.current = now;
    lastFrameRef.current = now;
    accumulatorRef.current = 0;
    tickSpeedRef.current = BASE_SPEED / speedRef.current;
    particlesRef.current = [];
    shakeRef.current = 0;
    setScore(0);
    draw(now, 0, 1);
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
    const { snakeWrap, difficulty } = optionsRef.current;
    const raw = { x: snake[0]!.x + delta.x, y: snake[0]!.y + delta.y };
    const outside = raw.x < 0 || raw.y < 0 || raw.x >= GRID || raw.y >= GRID;
    const head = snakeWrap
      ? { x: (raw.x + GRID) % GRID, y: (raw.y + GRID) % GRID }
      : raw;

    const hitWall = !snakeWrap && outside;
    const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      setStatus("over");
      play("gameover");
      onGameOver(scoreRef.current);
      return;
    }

    prevSnakeRef.current = snake;
    const next = [head, ...snake];
    const canvas = canvasRef.current;
    const cell = canvas ? canvas.width / GRID : 20;
    const bonus = bonusRef.current;
    if (bonus && head.x === bonus.x && head.y === bonus.y) {
      scoreRef.current += gain(20, difficulty);
      setScore(scoreRef.current);
      play("coin");
      spawnParticles(cell, (bonus.x + 0.5) * cell, (bonus.y + 0.5) * cell, paletteRef.current.yellow, 16);
      shakeRef.current = 1;
      bonusRef.current = null;
      nextBonusRef.current = performance.now() + BONUS_INTERVAL;
    } else if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += gain(10, difficulty);
      setScore(scoreRef.current);
      play("eat");
      spawnParticles(
        cell,
        (foodRef.current.x + 0.5) * cell,
        (foodRef.current.y + 0.5) * cell,
        paletteRef.current.magenta,
        10,
      );
      shakeRef.current = 0.6;
      foodRef.current = randomFree(next, bonusRef.current);
    } else {
      next.pop();
    }
    snakeRef.current = next;
  }, [onGameOver, play, setScore, setStatus, spawnParticles]);

  // Game loop
  useEffect(() => {
    if (status !== "running") return;
    const startedAt = performance.now();
    lastFrameRef.current = startedAt;
    lastTickRef.current = startedAt - accumulatorRef.current;

    const loop = (time: number) => {
      const frameDelta = Math.min(MAX_FRAME_DELTA, Math.max(0, time - lastFrameRef.current));
      lastFrameRef.current = time;

      const bonus = bonusRef.current;
      if (bonus && time - bonus.born > BONUS_LIFE) {
        bonusRef.current = null;
        nextBonusRef.current = time + BONUS_INTERVAL;
      } else if (!bonus && time > nextBonusRef.current) {
        const spot = randomFree(snakeRef.current, foodRef.current);
        bonusRef.current = { ...spot, born: time };
      }

      tickSpeedRef.current = Math.max(MIN_SPEED, BASE_SPEED - Math.floor(scoreRef.current / 30) * 8);
      accumulatorRef.current += frameDelta;
      let steps = 0;
      while (accumulatorRef.current >= tickSpeedRef.current && steps < 3) {
        accumulatorRef.current -= tickSpeedRef.current;
        step();
        steps += 1;
        if (useGameStore.getState().status !== "running") break;
      }
      if (steps === 3 && accumulatorRef.current >= tickSpeedRef.current) {
        accumulatorRef.current %= tickSpeedRef.current;
      }
      lastTickRef.current = time - accumulatorRef.current;
      draw(time, frameDelta, accumulatorRef.current / tickSpeedRef.current);
      if (useGameStore.getState().status === "running") {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) lastFrameRef.current = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [draw, status, step]);

  // Canvas sizing + first paint
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paletteRef.current = readPalette();
    let raf = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const dprLimit = mobile ? 1.25 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
      const px = Math.floor(rect.width * dpr);
      if (px <= 0) return;
      if (canvas.width === px && canvas.height === px) return;
      canvas.width = px;
      canvas.height = px;
      buildGridLayer(px);
      draw(performance.now(), 0);
    };
    resize();
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(resize);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [buildGridLayer, draw]);

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
