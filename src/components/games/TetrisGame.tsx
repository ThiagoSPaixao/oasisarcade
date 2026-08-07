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

/** Miniatura da próxima peça (coluna lateral). */
function PiecePreview({ def, size = 8 }: { def: PieceDef; size?: number }) {
  const cols = def.shape[0]!.length;
  return (
    <div
      className="border-foreground/10 bg-surface/40 grid gap-[2px] rounded-lg border p-1 backdrop-blur"
      style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}
    >
      {def.shape.flatMap((row, y) =>
        row.map((value, x) => (
          <span
            key={`${y}-${x}`}
            className="rounded-[2px]"
            style={{
              height: size,
              width: size,
              ...(value
                ? { background: `var(${def.color})`, boxShadow: `0 0 8px -2px var(${def.color})` }
                : {}),
            }}
          />
        )),
      )}
    </div>
  );
}

export function TetrisGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridLayerRef = useRef<HTMLCanvasElement | null>(null);
  const colorCacheRef = useRef<Record<string, string>>({});
  const boardRef = useRef<Cell[][]>(emptyBoard());
  const pieceRef = useRef<Piece>(fromDef(randomDef()));
  const queueRef = useRef<PieceDef[]>([randomDef(), randomDef(), randomDef()]);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const accumulatorRef = useRef(0);
  const lastFrameRef = useRef(0);
  const dirtyRef = useRef(true);
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

  /** Cor do tema lida uma única vez por nome (evita getComputedStyle por frame). */
  const color = useCallback((name: string, fallback: string) => {
    const cache = colorCacheRef.current;
    const hit = cache[name];
    if (hit) return hit;
    if (typeof window === "undefined") return fallback;
    const value =
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    cache[name] = value;
    return value;
  }, []);

  /** Grade pré-renderizada em camada separada. */
  const buildGridLayer = useCallback(
    (width: number, height: number) => {
      const layer = gridLayerRef.current ?? document.createElement("canvas");
      gridLayerRef.current = layer;
      layer.width = width;
      layer.height = height;
      const ctx = layer.getContext("2d");
      if (!ctx) return;
      const cell = width / COLS;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color("--background", "#12101c");
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = color("--border", "#3a2f52");
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < COLS; x += 1) {
        ctx.moveTo(Math.round(x * cell) + 0.5, 0);
        ctx.lineTo(Math.round(x * cell) + 0.5, height);
      }
      for (let y = 1; y < ROWS; y += 1) {
        ctx.moveTo(0, Math.round(y * cell) + 0.5);
        ctx.lineTo(width, Math.round(y * cell) + 0.5);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [color],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cell = canvas.width / COLS;

    const layer = gridLayerRef.current;
    if (layer && layer.width === canvas.width) ctx.drawImage(layer, 0, 0);
    else {
      ctx.fillStyle = color("--background", "#12101c");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const block = (x: number, y: number, colorVar: string, glow: number) => {
      const value = color(colorVar, "#ff4fd8");
      ctx.fillStyle = value;
      ctx.shadowColor = value;
      ctx.shadowBlur = glow;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      ctx.shadowBlur = 0;
    };

    for (let y = 0; y < ROWS; y += 1) {
      const row = boardRef.current[y]!;
      for (let x = 0; x < COLS; x += 1) {
        const c = row[x];
        if (c) block(x, y, c, 5);
      }
    }

    const piece = pieceRef.current;
    piece.shape.forEach((row, dy) =>
      row.forEach((value, dx) => {
        if (value) block(piece.x + dx, piece.y + dy, piece.color, 12);
      }),
    );
    dirtyRef.current = false;
  }, [color]);

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
    accumulatorRef.current = 0;
    lastFrameRef.current = 0;
    setLines(0);
    setScore(0);
    dirtyRef.current = true;
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
    dirtyRef.current = true;
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
        dirtyRef.current = true;
        return true;
      }
      return false;
    },
    [collides],
  );

  const rotatePiece = useCallback(() => {
    const piece = pieceRef.current;
    const next = { ...piece, shape: rotate(piece.shape) };
    for (const shift of [0, -1, 1, -2, 2]) {
      const candidate = { ...next, x: next.x + shift };
      if (!collides(candidate)) {
        pieceRef.current = candidate;
        play("rotate");
        dirtyRef.current = true;
        return;
      }
    }
  }, [collides, play]);

  /** Descida rápida (hard drop) — exclusiva do Tetris. */
  const hardDrop = useCallback(() => {
    let dropped = 0;
    while (move(0, 1)) dropped += 1;
    if (dropped > 0) {
      scoreRef.current += dropped * 2;
      setScore(scoreRef.current);
    }
    lockPiece();
  }, [lockPiece, move, setScore]);

  const softDrop = useCallback(() => {
    if (move(0, 1)) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      accumulatorRef.current = 0;
    }
  }, [move, setScore]);

  /** Loop com passo lógico fixo (acumulador) + desenho apenas quando muda. */
  useEffect(() => {
    if (status !== "running") return;
    lastFrameRef.current = 0;
    const loop = (time: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = time;
      const delta = Math.min(time - lastFrameRef.current, 120);
      lastFrameRef.current = time;
      const step = Math.max(120, BASE_SPEED - linesRef.current * 25);
      accumulatorRef.current += delta;
      let guard = 4;
      while (accumulatorRef.current >= step && guard > 0) {
        accumulatorRef.current -= step;
        guard -= 1;
        if (!move(0, 1)) lockPiece();
      }
      if (dirtyRef.current) draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, lockPiece, move, status]);

  // Evita salto ao voltar para a aba
  useEffect(() => {
    const onVisible = () => {
      lastFrameRef.current = 0;
      accumulatorRef.current = 0;
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2) return;
      const isMobile = window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      const width = Math.floor(rect.width * dpr);
      canvas.width = width;
      canvas.height = Math.floor(((rect.width * ROWS) / COLS) * dpr);
      buildGridLayer(canvas.width, canvas.height);
      dirtyRef.current = true;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [buildGridLayer, draw]);

  useEffect(() => {
    const held = new Set<string>();
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
        softDrop();
      } else if (["arrowup", "w"].includes(key) && running) {
        event.preventDefault();
        if (!held.has(key)) rotatePiece();
        held.add(key);
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
    const onKeyUp = (event: KeyboardEvent) => held.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [move, rotatePiece, setStatus, softDrop, start]);

  useEffect(() => {
    if (!directionInput) return;
    if (useGameStore.getState().status !== "running") return;
    const { direction } = directionInput;
    if (direction === "left") move(-1, 0);
    else if (direction === "right") move(1, 0);
    else if (direction === "down") softDrop();
    else rotatePiece();
  }, [directionInput, move, rotatePiece, softDrop]);

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

  const level = Math.floor(lines / 10) + 1;

  return (
    <div className="flex w-full min-w-0 items-stretch justify-center gap-2 sm:gap-3">
      <div
        className="game-fit relative"
        style={
          {
            "--game-max": "460px",
            "--game-aspect": `${COLS / ROWS}`,
            "--game-reserve": "252px",
          } as React.CSSProperties
        }
      >
        <canvas
          ref={canvasRef}
          className="bg-background pixel-border-cyan block w-full"
          style={{ imageRendering: "pixelated", aspectRatio: `${COLS} / ${ROWS}` }}
        />
        <GameOverlay
          title="TETRIS"
          hint="Setas movem · ↑ ou A gira · B desce rápido"
          onStart={() => (status === "paused" ? setStatus("running") : start())}
        />
      </div>

      <aside className="flex w-14 shrink-0 flex-col items-center gap-2 sm:w-20">
        <span className="ui-label text-muted-foreground text-[8px] tracking-widest sm:text-[9px]">
          PRÓX.
        </span>
        {nextPieces.map((def, index) => (
          <PiecePreview key={`${def.color}-${index}`} def={def} size={index === 0 ? 9 : 7} />
        ))}
        <div className="mt-1 text-center">
          <p className="ui-label text-muted-foreground text-[8px] tracking-widest">LINHAS</p>
          <p className="text-accent text-xs font-bold sm:text-sm">{lines}</p>
          <p className="ui-label text-muted-foreground mt-1 text-[8px] tracking-widest">NÍVEL</p>
          <p className="text-neon-yellow text-xs font-bold sm:text-sm">{level}</p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            if (useGameStore.getState().status === "running") hardDrop();
          }}
          className="border-accent/45 text-accent bg-surface/40 mt-auto w-full rounded-lg border py-1.5 text-[9px] font-semibold tracking-wide backdrop-blur transition-transform active:scale-95"
        >
          ↓↓
        </button>
      </aside>
    </div>
  );
}
