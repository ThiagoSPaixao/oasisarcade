import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { useSoundStore } from "@/stores/sound-store";
import { setMusicTheme, startMusic } from "@/lib/sound";
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

type PieceDef = { shape: Shape; color: string };

function randomDef(): PieceDef {
  return PIECES[Math.floor(Math.random() * PIECES.length)]!;
}

function fromDef(def: PieceDef): Piece {
  return {
    shape: def.shape,
    color: def.color,
    x: Math.floor((COLS - def.shape[0]!.length) / 2),
    y: 0,
  };
}

function spawn(): Piece {
  return fromDef(randomDef());
}

/** Miniatura da próxima peça. */
function PiecePreview({ def }: { def: PieceDef }) {
  const cols = def.shape[0]!.length;
  return (
    <div
      className="border-foreground/10 bg-surface/40 grid gap-[2px] rounded-lg border p-1.5 backdrop-blur"
      style={{ gridTemplateColumns: `repeat(${cols}, 10px)` }}
    >
      {def.shape.flatMap((row, y) =>
        row.map((value, x) => (
          <span
            key={`${y}-${x}`}
            className="h-[10px] w-[10px] rounded-[2px]"
            style={
              value
                ? { background: `var(${def.color})`, boxShadow: `0 0 8px -2px var(${def.color})` }
                : undefined
            }
          />
        )),
      )}
    </div>
  );
}

export function TetrisGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Cell[][]>(emptyBoard());
  const pieceRef = useRef<Piece>(spawn());
  const queueRef = useRef<PieceDef[]>([randomDef(), randomDef(), randomDef()]);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const lastTickRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [lines, setLines] = useState(0);
  const [nextPieces, setNextPieces] = useState<PieceDef[]>(() => queueRef.current);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setScore = useGameStore((s) => s.setScore);
  const directionInput = useGameStore((s) => s.directionInput);
  const actionInput = useGameStore((s) => s.actionInput);
  const play = useSoundStore((s) => s.play);
  const musicOn = useSoundStore((s) => s.music);

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

  const pullNext = useCallback(() => {
    const def = queueRef.current.shift() ?? randomDef();
    queueRef.current = [...queueRef.current, randomDef()];
    setNextPieces(queueRef.current);
    return fromDef(def);
  }, []);

  const reset = useCallback(() => {
    boardRef.current = emptyBoard();
    queueRef.current = [randomDef(), randomDef(), randomDef()];
    setNextPieces(queueRef.current);
    pieceRef.current = fromDef(randomDef());
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

    const next = pullNext();
    if (collides(next)) {
      setStatus("over");
      play("gameover");
      onGameOver(scoreRef.current);
      return;
    }
    pieceRef.current = next;
  }, [collides, onGameOver, play, pullNext, setScore, setStatus]);

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

  /** Descida rápida (hard drop) — exclusiva do Tetris. */
  const hardDrop = useCallback(() => {
    let dropped = 0;
    while (move(0, 1)) dropped += 1;
    if (dropped > 0) {
      scoreRef.current += dropped * 2;
      setScore(scoreRef.current);
    }
    lockPiece();
    draw();
  }, [draw, lockPiece, move, setScore]);

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
    } else if (actionInput.action === "b") {
      // No Tetris o B faz a peça descer rápido (não pausa).
      if (current === "running") hardDrop();
      else if (current === "paused") setStatus("running");
      else start();
    }
  }, [actionInput, hardDrop, rotatePiece, setStatus, start]);

  // Trilha clássica do Tetris enquanto o jogo estiver aberto
  useEffect(() => {
    setMusicTheme("tetris");
    if (musicOn) startMusic();
    return () => setMusicTheme("arcade");
  }, [musicOn]);

  return (
    <div
      className="game-fit relative"
      style={
        {
          "--game-max": "340px",
          "--game-aspect": `${COLS / ROWS}`,
          "--game-reserve": "360px",
        } as React.CSSProperties
      }
    >
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="ui-label text-muted-foreground text-[9px] tracking-widest">PRÓXIMAS</span>
        {nextPieces.map((def, index) => (
          <PiecePreview key={`${def.color}-${index}`} def={def} />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="bg-background pixel-border-cyan block w-full"
        style={{ imageRendering: "pixelated", aspectRatio: `${COLS} / ${ROWS}` }}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="ui-label text-muted-foreground text-[11px]">LINHAS {lines}</span>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            if (useGameStore.getState().status === "running") hardDrop();
          }}
          className="border-accent/45 text-accent bg-surface/40 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-wide backdrop-blur transition-transform active:scale-95"
        >
          DESCER ↓↓
        </button>
      </div>
      <GameOverlay
        title="TETRIS"
        hint="Setas movem · ↑ ou A gira · B desce rápido"
        onStart={() => (status === "paused" ? setStatus("running") : start())}
      />
    </div>
  );
}
