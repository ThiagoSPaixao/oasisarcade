import { create } from "zustand";
import { persist } from "zustand/middleware";
import { playSfx, setMusicEnabled, setSfxEnabled, startMusic, stopMusic, unlockAudio, type Sfx } from "@/lib/sound";

type SoundState = {
  sfx: boolean;
  music: boolean;
  toggleSfx: () => void;
  toggleMusic: () => void;
  play: (name: Sfx) => void;
  unlock: () => void;
};

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      sfx: true,
      music: true,
      toggleSfx: () => {
        const next = !get().sfx;
        setSfxEnabled(next);
        set({ sfx: next });
        if (next) {
          unlockAudio();
          playSfx("select");
        }
      },
      toggleMusic: () => {
        const next = !get().music;
        setMusicEnabled(next);
        set({ music: next });
        if (next) {
          unlockAudio();
          startMusic();
        } else {
          stopMusic();
        }
      },
      play: (name) => {
        if (get().sfx) playSfx(name);
      },
      unlock: () => {
        unlockAudio();
        setSfxEnabled(get().sfx);
        setMusicEnabled(get().music);
        if (get().music) startMusic();
      },
    }),
    {
      name: "retro-arcade-sound",
      version: 2,
      // v2 passa a ligar a música por padrão (o motor novo é mais agradável).
      migrate: (persisted) => ({ ...(persisted as object), music: true }) as never,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setSfxEnabled(state.sfx);
        setMusicEnabled(state.music);
      },
    },
  ),
);
