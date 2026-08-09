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

      // Fruta: cristal dourado facetado com halo
      const food = foodRef.current;
      const fc = center(food.x, food.y);
      const breathe = 1 + Math.sin(time / 260) * 0.08;
      const fr = cell * 0.3 * breathe;
      ctx.save();
      ctx.shadowColor = p.yellow;
      ctx.shadowBlur = 22;
      ctx.fillStyle = p.yellow;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = fc.cx + Math.cos(a) * fr;
        const py = fc.cy + Math.sin(a) * fr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.beginPath();
      ctx.moveTo(fc.cx, fc.cy - fr);
      ctx.lineTo(fc.cx, fc.cy + fr);
      ctx.moveTo(fc.cx - fr * 0.86, fc.cy - fr * 0.5);
      ctx.lineTo(fc.cx + fr * 0.86, fc.cy + fr * 0.5);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(fc.cx - fr * 0.28, fc.cy - fr * 0.34, cell * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Fruta especial (pulsa e desaparece)
      const bonus = bonusRef.current;
      if (bonus) {
        const age = (time - bonus.born) / BONUS_LIFE;
        const pulse = 0.82 + Math.sin(time / 120) * 0.14;
        const bc = center(bonus.x, bonus.y);
        ctx.save();
        ctx.globalAlpha = age > 0.75 ? (Math.sin(time / 90) > 0 ? 1 : 0.25) : 1;
        ctx.fillStyle = p.magenta;
        ctx.shadowColor = p.magenta;
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

      /** Cor neon arco-íris por placa do corpo (cabeça ciano → cauda magenta). */
      const segColor = (index: number, light = 60, alpha = 1) =>
        `hsla(${(186 + index * 13) % 360} 92% ${light}% / ${alpha})`;

      /** true quando os dois pontos são vizinhos reais (evita rastro ao atravessar a borda). */
      const linked = (i: number) => {
        const a = pts[i]!;
        const b = pts[i - 1]!;
        return Math.hypot(b.cx - a.cx, b.cy - a.cy) <= cell * 1.6;
      };

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Reflexo suave no chão
      ctx.globalAlpha = 0.12;
      for (let i = pts.length - 1; i > 0; i -= 1) {
        if (!linked(i)) continue;
        ctx.strokeStyle = segColor(i, 55);
        ctx.lineWidth = cell * 0.7;
        ctx.beginPath();
        ctx.moveTo(pts[i]!.cx, pts[i]!.cy + cell * 0.34);
        ctx.lineTo(pts[i - 1]!.cx, pts[i - 1]!.cy + cell * 0.34);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Halo neon difuso por placa
      ctx.globalAlpha = 0.18;
      for (let i = pts.length - 1; i > 0; i -= 1) {
        if (!linked(i)) continue;
        ctx.strokeStyle = segColor(i, 62);
        ctx.lineWidth = cell * 1.02;
        ctx.beginPath();
        ctx.moveTo(pts[i]!.cx, pts[i]!.cy);
        ctx.lineTo(pts[i - 1]!.cx, pts[i - 1]!.cy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Corpo: placas de armadura coloridas com divisória escura
      for (let i = pts.length - 1; i > 0; i -= 1) {
        const a = pts[i]!;
        const b = linked(i) ? pts[i - 1]! : pts[i]!;
        ctx.strokeStyle = segColor(i, 56);
        ctx.lineWidth = cell * 0.8;
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();

        // brilho especular no topo da placa
        ctx.strokeStyle = segColor(i, 84, 0.55);
        ctx.lineWidth = cell * 0.24;
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy - cell * 0.18);
        ctx.lineTo(b.cx, b.cy - cell * 0.18);
        ctx.stroke();

        // divisória entre placas
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        ctx.strokeStyle = "rgba(6,8,14,0.75)";
        ctx.lineWidth = Math.max(1, cell * 0.07);
        ctx.beginPath();
        ctx.moveTo(a.cx + nx * cell * 0.38, a.cy + ny * cell * 0.38);
        ctx.lineTo(a.cx - nx * cell * 0.38, a.cy - ny * cell * 0.38);
        ctx.stroke();
      }


      // Cabeça robótica angular com visor luminoso
      const head = pts[0]!;
      const d = DELTA[dirRef.current];
      const perp = { x: -d.y, y: d.x };
      const fwd = (n: number) => ({ x: d.x * cell * n, y: d.y * cell * n });
      const side = (n: number) => ({ x: perp.x * cell * n, y: perp.y * cell * n });
      const at = (f: number, s: number) => {
        const a = fwd(f);
        const b = side(s);
        return { x: head.cx + a.x + b.x, y: head.cy + a.y + b.y };
      };

      // gargantilha metálica
      ctx.strokeStyle = "rgba(20,26,38,0.9)";
      ctx.lineWidth = cell * 0.86;
      ctx.beginPath();
      ctx.moveTo(head.cx - d.x * cell * 0.42, head.cy - d.y * cell * 0.42);
      ctx.lineTo(head.cx - d.x * cell * 0.12, head.cy - d.y * cell * 0.12);
      ctx.stroke();

      const jaw = Math.max(0, Math.sin(time / 220)) * 0.12;
      ctx.shadowColor = p.cyan;
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#1b3b45";
      ctx.beginPath();
      const shell = [at(-0.3, 0.4), at(0.24, 0.34), at(0.52, 0.12), at(0.52, -0.12), at(0.24, -0.34), at(-0.3, -0.4)];
      shell.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // placa superior brilhante
      ctx.fillStyle = "rgba(120,240,255,0.35)";
      ctx.beginPath();
      const top = [at(-0.24, 0.3), at(0.2, 0.24), at(0.44, 0.06), at(0.44, -0.06), at(0.2, -0.24), at(-0.24, -0.3)];
      top.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.closePath();
      ctx.fill();

      // mandíbula que abre ao ritmo do movimento
      ctx.fillStyle = "#12262e";
      ctx.beginPath();
      const jawPts = [at(0.14, 0.26), at(0.56, 0.06 - jaw), at(0.56, -0.06 - jaw), at(0.14, -0.26)];
      jawPts.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.closePath();
      ctx.fill();

      // presas
      ctx.strokeStyle = "rgba(220,255,255,0.9)";
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.beginPath();
      for (const s of [0.16, -0.16]) {
        const from = at(0.4, s);
        const to = at(0.56, s - Math.sign(s) * 0.03 - jaw * Math.sign(s || 1) * 0);
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y + cell * jaw);
      }
      ctx.stroke();

      // visor magenta
      const blink = Math.sin(time / 900) > 0.985;
      ctx.shadowColor = p.magenta;
      ctx.shadowBlur = blink ? 4 : 16;
      ctx.fillStyle = p.magenta;
      ctx.beginPath();
      const visor = [at(0.02, 0.24), at(0.28, 0.16), at(0.28, 0.04), at(0.02, 0.08)];
      visor.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      const visor2 = [at(0.02, -0.24), at(0.28, -0.16), at(0.28, -0.04), at(0.02, -0.08)];
      visor2.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
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

      const factor = speedRef.current;
      tickSpeedRef.current = Math.max(
        MIN_SPEED / factor,
        (BASE_SPEED - Math.floor(scoreRef.current / 30) * 8) / factor,
      );
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

  // Mudança de dificuldade/bordas reinicia a partida
  useEffect(() => {
    reset();
    setStatus("idle");
  }, [options.difficulty, options.snakeWrap, reset, setStatus]);

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
