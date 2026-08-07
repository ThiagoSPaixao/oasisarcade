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
      music: false,
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setSfxEnabled(state.sfx);
        setMusicEnabled(state.music);
      },
    },
  ),
);
