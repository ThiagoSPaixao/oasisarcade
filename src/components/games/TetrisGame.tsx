import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { GameOverlay } from "./GameOverlay";

const COLS = 10;
const ROWS = 20;
const BASE_SPEED = 620;

type Shape = number[][];

const PIECES: { shape: Shape; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "--neon-cyan" },
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "--neon-yellow",
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "--neon-magenta",
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "--chart-5",
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "--accent",
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "--neon-green",
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "--destructive",
  },
];

type Piece = { shape: Shape; color: string; x: number; y: number };
type Cell = string | null;

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

function rotate(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0]!.length;
  return Array.from({ length: cols }, (_, x) =>
    Array.from({ length: rows }, (_, y) => shape[rows - 1 - y]![x]!),
  );
}

function spawn(): Piece {
  const piece = PIECES[Math.floor(Math.random() * PIECES.length)]!;
  return {
    shape: piece.shape,
    color: piece.color,
    x: Math.floor((COLS - piece.shape[0]!.length) / 2),
    y: 0,
  };
}

export function TetrisGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Cell[][]>(emptyBoard());
  const pieceRef = useRef<Piece>(spawn());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const lastTickRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [lines, setLines] = useState(0);

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
    const cell = canvas.width / COLS;
    ctx.fillStyle = cssVar("--background", "#12101c");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = cssVar("--border", "#3a2f52");
    ctx.globalAlpha = 0.3;
    for (let x = 1; x < COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, canvas.height);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell);
      ctx.lineTo(canvas.width, y * cell);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const block = (x: number, y: number, colorVar: string, glow: number) => {
      ctx.fillStyle = cssVar(colorVar, "#ff4fd8");
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = glow;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      ctx.shadowBlur = 0;
    };

    boardRef.current.forEach((row, y) =>
      row.forEach((color, x) => {
        if (color) block(x, y, color, 5);
      }),
    );

    const piece = pieceRef.current;
    piece.shape.forEach((row, dy) =>
      row.forEach((value, dx) => {
        if (value) block(piece.x + dx, piece.y + dy, piece.color, 12);
      }),
    );
  }, []);

  const collides = useCallback((piece: Piece) => {
    return piece.shape.some((row, dy) =>
      row.some((value, dx) => {
        if (!value) return false;
        const x = piece.x + dx;
        const y = piece.y + dy;
        return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && boardRef.current[y]![x] !== null);
      }),
    );
  }, []);

  const reset = useCallback(() => {
    boardRef.current = emptyBoard();
    pieceRef.current = spawn();
    scoreRef.current = 0;
    linesRef.current = 0;
    lastTickRef.current = 0;
    setLines(0);
    setScore(0);
    draw();
  }, [draw, setScore]);

  const start = useCallback(() => {
    reset();
    setStatus("running");
  }, [reset, setStatus]);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    piece.shape.forEach((row, dy) =>
      row.forEach((value, dx) => {
        if (value && piece.y + dy >= 0) boardRef.current[piece.y + dy]![piece.x + dx] = piece.color;
      }),
    );
    play("drop");

    const kept = boardRef.current.filter((row) => row.some((cell) => cell === null));
    const cleared = ROWS - kept.length;
    if (cleared > 0) {
      boardRef.current = [
        ...Array.from({ length: cleared }, () => Array.from({ length: COLS }, () => null as Cell)),
        ...kept,
      ];
      linesRef.current += cleared;
      setLines(linesRef.current);
      scoreRef.current += [0, 100, 300, 500, 800][cleared] ?? 100 * cleared;
      setScore(scoreRef.current);
      play("line");
    }

    const next = spawn();
    if (collides(next)) {
      setStatus("over");
      play("gameover");
      onGameOver(scoreRef.current);
      return;
    }
    pieceRef.current = next;
  }, [collides, onGameOver, play, setScore, setStatus]);

  const move = useCallback(
    (dx: number, dy: number) => {
      const piece = pieceRef.current;
      const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
      if (!collides(next)) {
        pieceRef.current = next;
        draw();
        return true;
      }
      return false;
    },
    [collides, draw],
  );

  const rotatePiece = useCallback(() => {
    const piece = pieceRef.current;
    const next = { ...piece, shape: rotate(piece.shape) };
    for (const shift of [0, -1, 1, -2, 2]) {
      const candidate = { ...next, x: next.x + shift };
      if (!collides(candidate)) {
        pieceRef.current = candidate;
        play("rotate");
        draw();
        return;
      }
    }
  }, [collides, draw, play]);

  const tick = useCallback(() => {
    if (!move(0, 1)) lockPiece();
    draw();
  }, [draw, lockPiece, move]);

  useEffect(() => {
    if (status !== "running") return;
    const loop = (time: number) => {
      const speed = Math.max(140, BASE_SPEED - linesRef.current * 25);
      if (time - lastTickRef.current >= speed) {
        lastTickRef.current = time;
        tick();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, tick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(((rect.width * ROWS) / COLS) * dpr);
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const running = useGameStore.getState().status === "running";
      if (["arrowleft", "a"].includes(key) && running) {
        event.preventDefault();
        move(-1, 0);
      } else if (["arrowright", "d"].includes(key) && running) {
        event.preventDefault();
        move(1, 0);
      } else if (["arrowdown", "s"].includes(key) && running) {
        event.preventDefault();
        if (move(0, 1)) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
      } else if (["arrowup", "w"].includes(key) && running) {
        event.preventDefault();
        rotatePiece();
      } else if (key === " " || key === "p") {
        event.preventDefault();
        const current = useGameStore.getState().status;
        if (current === "running") setStatus("paused");
        else if (current === "paused") setStatus("running");
        else start();
      } else if (key === "enter") {
        const current = useGameStore.getState().status;
        if (current !== "running") start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, rotatePiece, setScore, setStatus, start]);

  useEffect(() => {
    if (!directionInput) return;
    if (useGameStore.getState().status !== "running") return;
    const { direction } = directionInput;
    if (direction === "left") move(-1, 0);
    else if (direction === "right") move(1, 0);
    else if (direction === "down") move(0, 1);
    else rotatePiece();
  }, [directionInput, move, rotatePiece]);

  useEffect(() => {
    if (!actionInput) return;
    const current = useGameStore.getState().status;
    if (actionInput.action === "a") {
      if (current === "running") rotatePiece();
      else if (current === "paused") setStatus("running");
      else start();
    } else if (current === "running") setStatus("paused");
    else if (current === "paused") setStatus("running");
  }, [actionInput, rotatePiece, setStatus, start]);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <canvas
        ref={canvasRef}
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${COLS} / ${ROWS}` }}
      />
      <p className="ui-label text-muted-foreground mt-2 text-center text-[11px]">LINHAS {lines}</p>
      <GameOverlay
        title="TETRIS"
        hint="Setas para mover · ↑ ou A gira · ↓ desce"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
