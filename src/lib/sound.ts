/**
 * 8-bit sound engine (Web Audio API, no assets).
 * Square/triangle oscillators for chiptune SFX + a looping arcade theme.
 * Every call is a no-op until the user unlocks audio with a gesture.
 */

export type Sfx =
  | "select"
  | "confirm"
  | "back"
  | "coin"
  | "eat"
  | "rotate"
  | "drop"
  | "line"
  | "laser"
  | "explosion"
  | "match"
  | "miss"
  | "levelup"
  | "gameover";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxEnabled = true;
let musicEnabled = true;
let musicTimer: ReturnType<typeof setTimeout> | null = null;
let musicStep = 0;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call from a user gesture (click/tap) so mobile browsers allow audio. */
export function unlockAudio() {
  ensureContext();
}

export function setSfxEnabled(value: boolean) {
  sfxEnabled = value;
}

export function setMusicEnabled(value: boolean) {
  musicEnabled = value;
  if (!value) stopMusic();
}

type ToneOptions = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
  target?: GainNode | null;
};

function tone({ freq, duration, type = "square", gain = 0.5, delay = 0, slideTo, target }: ToneOptions) {
  const audio = ensureContext();
  if (!audio || !master) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const env = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(env);
  env.connect(target ?? master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise(duration: number, gain = 0.35, delay = 0) {
  const audio = ensureContext();
  if (!audio || !master) return;
  const start = audio.currentTime + delay;
  const frames = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const env = audio.createGain();
  env.gain.setValueAtTime(gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(env);
  env.connect(master);
  src.start(start);
}

/** Plays a chiptune sound effect. Silent when SFX are off. */
export function playSfx(name: Sfx) {
  if (!sfxEnabled) return;
  switch (name) {
    case "select":
      tone({ freq: 660, duration: 0.06, gain: 0.35 });
      break;
    case "confirm":
      tone({ freq: 523, duration: 0.08 });
      tone({ freq: 784, duration: 0.1, delay: 0.07 });
      tone({ freq: 1046, duration: 0.12, delay: 0.15 });
      break;
    case "back":
      tone({ freq: 440, duration: 0.09, slideTo: 220 });
      break;
    case "coin":
      tone({ freq: 988, duration: 0.06 });
      tone({ freq: 1319, duration: 0.22, delay: 0.06 });
      break;
    case "eat":
      tone({ freq: 740, duration: 0.06, type: "triangle" });
      tone({ freq: 1100, duration: 0.07, delay: 0.05 });
      break;
    case "rotate":
      tone({ freq: 520, duration: 0.05, gain: 0.3 });
      break;
    case "drop":
      tone({ freq: 180, duration: 0.09, type: "triangle", slideTo: 90 });
      break;
    case "line":
      [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, duration: 0.1, delay: i * 0.05 }));
      break;
    case "laser":
      tone({ freq: 1200, duration: 0.1, slideTo: 260, gain: 0.28 });
      break;
    case "explosion":
      noise(0.34, 0.4);
      tone({ freq: 180, duration: 0.3, type: "triangle", slideTo: 50, gain: 0.35 });
      break;
    case "match":
      tone({ freq: 784, duration: 0.09, type: "triangle" });
      tone({ freq: 1175, duration: 0.14, delay: 0.08, type: "triangle" });
      break;
    case "miss":
      tone({ freq: 300, duration: 0.12, slideTo: 180, gain: 0.3 });
      break;
    case "levelup":
      [659, 784, 988, 1319].forEach((freq, i) => tone({ freq, duration: 0.14, delay: i * 0.09 }));
      break;
    case "gameover":
      [523, 466, 392, 262].forEach((freq, i) =>
        tone({ freq, duration: 0.26, delay: i * 0.18, type: "triangle" }),
      );
      break;
  }
}

// --- Looping themes -------------------------------------------------------
export type MusicTheme = "arcade" | "tetris";

const ARCADE_MELODY = [
  659, 0, 523, 0, 587, 0, 494, 0, 523, 0, 440, 0, 392, 0, 0, 0, 587, 0, 523, 0, 494, 0, 440, 0, 392,
  0, 440, 0, 494, 0, 0, 0,
];
const ARCADE_BASS = [
  131, 0, 0, 0, 165, 0, 0, 0, 131, 0, 0, 0, 98, 0, 0, 0, 147, 0, 0, 0, 110, 0, 0, 0, 131, 0, 0, 0,
  98, 0, 0, 0,
];

/** Korobeiniki (tema clássico do Tetris), grade de colcheias. */
const TETRIS_MELODY = [
  659, 0, 494, 523, 587, 0, 523, 494,
  440, 0, 440, 523, 659, 0, 587, 523,
  494, 0, 0, 523, 587, 0, 659, 0,
  523, 0, 440, 0, 440, 0, 0, 0,
  587, 0, 0, 698, 880, 0, 784, 698,
  659, 0, 0, 523, 659, 0, 587, 523,
  494, 0, 494, 523, 587, 0, 659, 0,
  523, 0, 440, 0, 440, 0, 0, 0,
];
const TETRIS_BASS = [
  220, 0, 165, 0, 220, 0, 165, 0,
  220, 0, 165, 0, 220, 0, 165, 0,
  247, 0, 196, 0, 247, 0, 196, 0,
  220, 0, 165, 0, 220, 0, 165, 0,
  294, 0, 220, 0, 294, 0, 220, 0,
  262, 0, 196, 0, 262, 0, 196, 0,
  247, 0, 196, 0, 247, 0, 196, 0,
  220, 0, 165, 0, 220, 0, 165, 0,
];

const TRACKS: Record<MusicTheme, { melody: number[]; bass: number[]; step: number }> = {
  arcade: { melody: ARCADE_MELODY, bass: ARCADE_BASS, step: 150 },
  tetris: { melody: TETRIS_MELODY, bass: TETRIS_BASS, step: 148 },
};

let currentTheme: MusicTheme = "arcade";

/** Troca a trilha em execução (ex.: tema do Tetris dentro do jogo). */
export function setMusicTheme(theme: MusicTheme) {
  if (currentTheme === theme) return;
  currentTheme = theme;
  musicStep = 0;
  if (musicTimer) {
    stopMusic();
    startMusic();
  }
}

export function startMusic() {
  if (!musicEnabled || musicTimer) return;
  const audio = ensureContext();
  if (!audio) return;
  const tick = () => {
    if (!musicEnabled) return stopMusic();
    const track = TRACKS[currentTheme];
    const lead = track.melody[musicStep % track.melody.length];
    const bass = track.bass[musicStep % track.bass.length];
    if (lead) tone({ freq: lead, duration: 0.13, type: "square", gain: 0.12 });
    if (bass) tone({ freq: bass, duration: 0.2, type: "triangle", gain: 0.16 });
    musicStep += 1;
    musicTimer = setTimeout(tick, track.step);
  };
  tick();
}

export function stopMusic() {
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = null;
}

