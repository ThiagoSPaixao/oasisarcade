import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { useGameOptions } from "@/stores/settings-store";
import { DIFFICULTY_META, gain } from "@/lib/game-options";
import { GameOverlay } from "./GameOverlay";

const W = 320;
const H = 420;
const LANES = 3;
const LANE_W = W / LANES;
const CAR_W = 30;
const CAR_H = 46;
const CAR_Y = H - 78;

type Obstacle = { lane: number; y: number; kind: "car" | "coin" };

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const laneX = (lane: number) => lane * LANE_W + LANE_W / 2;

export function MiniRacerGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laneRef = useRef(1);
  const carXRef = useRef(laneX(1));
  const obstaclesRef = useRef<Obstacle[]>([]);
  const distanceRef = useRef(0);
  const scoreRef = useRef(0);
  const speedRef2 = useRef(3.2);
  const dashRef = useRef(0);
  const spawnRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);

  // Configurações isoladas do Mini Racer.
  const options = useGameOptions("mini-racer");
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const diffRef = useRef(DIFFICULTY_META[options.difficulty].speed);
  diffRef.current = DIFFICULTY_META[options.difficulty].speed;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = cssVar("--background", "#12101c");
    ctx.fillRect(0, 0, W, H);

    const rect = (x: number, y: number, w: number, h: number, colorVar: string, blur = 10) => {
      ctx.fillStyle = cssVar(colorVar, "#ff4fd8");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = blur;
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
    };

    // Bordas da pista e faixas em movimento (sensação de velocidade).
    rect(0, 0, 4, H, "--neon-green", 12);
    rect(W - 4, 0, 4, H, "--neon-green", 12);
    for (let lane = 1; lane < LANES; lane += 1) {
      for (let y = -40 + (dashRef.current % 40); y < H; y += 40) {
        rect(lane * LANE_W - 1.5, y, 3, 20, "--neon-magenta", 8);
      }
    }

    for (const obstacle of obstaclesRef.current) {
      const x = laneX(obstacle.lane);
      if (obstacle.kind === "car") {
        rect(x - CAR_W / 2, obstacle.y, CAR_W, CAR_H, "--neon-magenta");
        rect(x - CAR_W / 2 + 4, obstacle.y + CAR_H - 10, CAR_W - 8, 6, "--neon-yellow", 6);
      } else {
        rect(x - 6, obstacle.y + 12, 12, 12, "--neon-yellow", 12);
      }
    }

    // Carro do jogador.
    const cx = carXRef.current;
    rect(cx - CAR_W / 2, CAR_Y, CAR_W, CAR_H, "--neon-cyan");
    rect(cx - CAR_W / 2 + 4, CAR_Y + 6, CAR_W - 8, 12, "--background", 0);

    ctx.fillStyle = cssVar("--muted-foreground", "#9aa0b5");
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.floor(distanceRef.current)} M`, 10, 16);
  }, []);

  const reset = useCallback(() => {
    laneRef.current = 1;
    carXRef.current = laneX(1);
    obstaclesRef.current = [];
    distanceRef.current = 0;
    scoreRef.current = 0;
    speedRef2.current = 3.2 * diffRef.current;
    spawnRef.current = 0;
    dashRef.current = 0;
    setScore(0);
    draw();
  }, [draw, setScore]);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const moveLane = useCallback(
    (delta: number) => {
      if (useGameStore.getState().status !== "running") return;
      const next = Math.max(0, Math.min(LANES - 1, laneRef.current + delta));
      if (next === laneRef.current) return;
      laneRef.current = next;
      play("select");
    },
    [play],
  );

  const step = useCallback(() => {
    const speed = speedRef2.current;
    dashRef.current += speed;
    distanceRef.current += speed * 0.2;
    speedRef2.current = Math.min(9 * diffRef.current, speed + 0.0016 * diffRef.current);

    // Interpolação suave entre faixas.
    const target = laneX(laneRef.current);
    carXRef.current += (target - carXRef.current) * 0.28;

    // Pontuação por distância percorrida.
    const distanceScore = gain(Math.floor(distanceRef.current), optionsRef.current.difficulty);
    if (distanceScore !== scoreRef.current) {
      scoreRef.current = distanceScore;
      setScore(scoreRef.current);
    }

    spawnRef.current -= speed;
    if (spawnRef.current <= 0) {
      spawnRef.current = 140 + Math.random() * 90;
      const lane = Math.floor(Math.random() * LANES);
      obstaclesRef.current.push({ lane, y: -CAR_H, kind: Math.random() < 0.22 ? "coin" : "car" });
      // Uma segunda faixa ocupada de vez em quando, sempre deixando saída.
      if (Math.random() < 0.35) {
        const other = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
        if (other !== lane) obstaclesRef.current.push({ lane: other, y: -CAR_H - 30, kind: "car" });
      }
    }

    obstaclesRef.current = obstaclesRef.current.filter((obstacle) => {
      obstacle.y += speed;
      if (obstacle.y > H + CAR_H) return false;
      const overlapY = obstacle.y + CAR_H > CAR_Y && obstacle.y < CAR_Y + CAR_H;
      const sameLane = Math.abs(laneX(obstacle.lane) - carXRef.current) < CAR_W * 0.7;
      if (!overlapY || !sameLane) return true;
      if (obstacle.kind === "coin") {
        scoreRef.current += gain(25, optionsRef.current.difficulty);
        setScore(scoreRef.current);
        play("eat");
        return false;
      }
      setStatus("over");
      play("gameover");
      onGameOver(scoreRef.current);
      return false;
    });

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
      if (["arrowleft", "a"].includes(key)) moveLane(-1);
      else if (["arrowright", "d"].includes(key)) moveLane(1);
      else if (key === " " || key === "enter") {
        event.preventDefault();
        const current = useGameStore.getState().status;
        if (current === "paused") setStatus("running");
        else if (current !== "running") start();
        else setStatus("paused");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveLane, setStatus, start]);

  useEffect(() => {
    if (!directionInput) return;
    if (directionInput.direction === "left") moveLane(-1);
    else if (directionInput.direction === "right") moveLane(1);
  }, [directionInput, moveLane]);

  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a") {
      if (current === "paused") setStatus("running");
      else if (current !== "running") start();
    } else if (current === "running") setStatus("paused");
    else if (current === "paused") setStatus("running");
  }, [actionInput, setStatus, start]);

  useEffect(() => {
    reset();
    setStatus("idle");
  }, [options.difficulty, reset, setStatus]);

  return (
    <div
      className="game-fit relative"
      style={
        {
          "--game-max": "340px",
          "--game-aspect": `${W / H}`,
          "--game-reserve": "300px",
        } as React.CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Área de jogo do Mini Racer"
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${W} / ${H}` }}
      />
      <GameOverlay
        title="MINI RACER"
        hint="← → (ou D-Pad) trocam de faixa · desvie dos carros e pegue as moedas"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
