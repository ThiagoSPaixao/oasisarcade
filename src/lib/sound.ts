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
// Sequenciador com agendamento antecipado (lookahead) no relógio do WebAudio:
// sem jitter de setTimeout, com envelopes ADSR, filtro e delay para dar corpo.

export type MusicTheme = "title" | "arcade" | "tetris";

type Track = {
  /** duração de uma colcheia, em segundos (maior = mais lento) */
  stepSeconds: number;
  melody: number[];
  bass: number[];
  /** acorde arpejado opcional, tocado em volume baixo */
  pad?: number[];
  filterHz: number;
  leadType: OscillatorType;
};

const R = 0; // silêncio

/** Tema da tela inicial: lento, atmosférico, arpejo neon. */
const TITLE_MELODY = [
  659, R, R, 784, R, 880, R, R, 988, R, 880, R, 784, R, R, R,
  659, R, R, 587, R, 659, R, R, 784, R, R, 659, R, R, R, R,
];
const TITLE_BASS = [
  110, R, R, R, 110, R, R, R, 147, R, R, R, 147, R, R, R,
  165, R, R, R, 165, R, R, R, 98, R, R, R, 98, R, R, R,
];
const TITLE_PAD = [
  330, R, 415, R, 494, R, 415, R, 349, R, 440, R, 523, R, 440, R,
  330, R, 415, R, 494, R, 587, R, 294, R, 392, R, 494, R, 392, R,
];

const ARCADE_MELODY = [
  659, R, 523, R, 587, R, 494, R, 523, R, 440, R, 392, R, R, R,
  587, R, 523, R, 494, R, 440, R, 392, R, 440, R, 494, R, R, R,
];
const ARCADE_BASS = [
  131, R, R, R, 165, R, R, R, 131, R, R, R, 98, R, R, R,
  147, R, R, R, 110, R, R, R, 131, R, R, R, 98, R, R, R,
];

/** Korobeiniki (tema clássico do Tetris), grade de colcheias. */
const TETRIS_MELODY = [
  659, R, 494, 523, 587, R, 523, 494,
  440, R, 440, 523, 659, R, 587, 523,
  494, R, R, 523, 587, R, 659, R,
  523, R, 440, R, 440, R, R, R,
  587, R, R, 698, 880, R, 784, 698,
  659, R, R, 523, 659, R, 587, 523,
  494, R, 494, 523, 587, R, 659, R,
  523, R, 440, R, 440, R, R, R,
];
const TETRIS_BASS = [
  220, R, 165, R, 220, R, 165, R,
  220, R, 165, R, 220, R, 165, R,
  247, R, 196, R, 247, R, 196, R,
  220, R, 165, R, 220, R, 165, R,
  294, R, 220, R, 294, R, 220, R,
  262, R, 196, R, 262, R, 196, R,
  247, R, 196, R, 247, R, 196, R,
  220, R, 165, R, 220, R, 165, R,
];

const TRACKS: Record<MusicTheme, Track> = {
  title: {
    stepSeconds: 0.3,
    melody: TITLE_MELODY,
    bass: TITLE_BASS,
    pad: TITLE_PAD,
    filterHz: 2200,
    leadType: "triangle",
  },
  arcade: { stepSeconds: 0.19, melody: ARCADE_MELODY, bass: ARCADE_BASS, filterHz: 2800, leadType: "square" },
  // Mais lento que o original para ficar agradável durante partidas longas.
  tetris: { stepSeconds: 0.225, melody: TETRIS_MELODY, bass: TETRIS_BASS, filterHz: 2600, leadType: "square" },
};

let currentTheme: MusicTheme = "arcade";
let musicBus: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let scheduler: ReturnType<typeof setInterval> | null = null;
let nextNoteTime = 0;

function ensureMusicBus(audio: AudioContext): GainNode | null {
  if (!master) return null;
  if (musicBus && musicFilter) {
    musicFilter.frequency.value = TRACKS[currentTheme].filterHz;
    return musicBus;
  }
  musicBus = audio.createGain();
  musicBus.gain.value = 0.75;
  musicFilter = audio.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.frequency.value = TRACKS[currentTheme].filterHz;
  musicFilter.Q.value = 0.6;

  // Delay curto em stereo dá profundidade sem sujar o chiptune.
  const delay = audio.createDelay(0.6);
  delay.delayTime.value = TRACKS[currentTheme].stepSeconds * 1.5;
  const feedback = audio.createGain();
  feedback.gain.value = 0.22;
  const wet = audio.createGain();
  wet.gain.value = 0.2;

  musicBus.connect(musicFilter);
  musicFilter.connect(master);
  musicFilter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);
  return musicBus;
}

type VoiceOptions = {
  freq: number;
  start: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  detune?: number;
  attack?: number;
  release?: number;
};

/** Voz com ADSR suave — evita os "cliques" do envelope antigo. */
function voice({ freq, start, duration, type, gain, detune = 0, attack = 0.012, release = 0.09 }: VoiceOptions) {
  const audio = ctx;
  const bus = audio ? ensureMusicBus(audio) : null;
  if (!audio || !bus) return;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (detune) osc.detune.setValueAtTime(detune, start);
  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(gain, start + attack);
  env.gain.linearRampToValueAtTime(gain * 0.72, start + duration * 0.6);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);
  osc.connect(env);
  env.connect(bus);
  osc.start(start);
  osc.stop(start + duration + release + 0.02);
}

function scheduleStep(step: number, time: number) {
  const track = TRACKS[currentTheme];
  const dur = track.stepSeconds * 0.9;
  const lead = track.melody[step % track.melody.length];
  const bass = track.bass[step % track.bass.length];
  const pad = track.pad?.[step % track.pad.length];

  if (lead) {
    voice({ freq: lead, start: time, duration: dur, type: track.leadType, gain: 0.1 });
    // segunda voz levemente desafinada = timbre mais rico
    voice({ freq: lead, start: time, duration: dur, type: "triangle", gain: 0.05, detune: 8 });
  }
  if (bass) {
    voice({ freq: bass, start: time, duration: track.stepSeconds * 1.4, type: "triangle", gain: 0.13, release: 0.14 });
    voice({ freq: bass / 2, start: time, duration: track.stepSeconds * 1.4, type: "sine", gain: 0.09, release: 0.16 });
  }
  if (pad) {
    voice({ freq: pad, start: time, duration: track.stepSeconds * 1.2, type: "sine", gain: 0.05, attack: 0.05, release: 0.2 });
  }
}

function runScheduler() {
  const audio = ctx;
  if (!audio) return;
  if (!musicEnabled) return stopMusic();
  while (nextNoteTime < audio.currentTime + 0.25) {
    scheduleStep(musicStep, Math.max(nextNoteTime, audio.currentTime + 0.02));
    musicStep += 1;
    nextNoteTime += TRACKS[currentTheme].stepSeconds;
  }
}

/** Troca a trilha em execução (ex.: tema do Tetris dentro do jogo). */
export function setMusicTheme(theme: MusicTheme) {
  if (currentTheme === theme) return;
  const wasPlaying = scheduler !== null;
  if (wasPlaying) stopMusic();
  currentTheme = theme;
  musicStep = 0;
  if (musicFilter) musicFilter.frequency.value = TRACKS[theme].filterHz;
  if (wasPlaying) startMusic();
}

export function startMusic() {
  if (!musicEnabled || scheduler) return;
  const audio = ensureContext();
  if (!audio || !ensureMusicBus(audio)) return;
  nextNoteTime = audio.currentTime + 0.1;
  runScheduler();
  scheduler = setInterval(runScheduler, 60);
}

export function stopMusic() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
}
