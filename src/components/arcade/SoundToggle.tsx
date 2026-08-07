import { Music, Music4, Volume2, VolumeX } from "lucide-react";
import { useSoundStore } from "@/stores/sound-store";
import { cn } from "@/lib/utils";

/** Liga/desliga efeitos sonoros e trilha 8-bit. */
export function SoundToggle({ className }: { className?: string }) {
  const sfx = useSoundStore((s) => s.sfx);
  const music = useSoundStore((s) => s.music);
  const toggleSfx = useSoundStore((s) => s.toggleSfx);
  const toggleMusic = useSoundStore((s) => s.toggleMusic);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggleSfx}
        aria-pressed={sfx}
        aria-label={sfx ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
        title={sfx ? "Efeitos: ligados" : "Efeitos: desligados"}
        className={cn(
          "pixel-border grid h-10 w-10 shrink-0 place-items-center transition-transform active:scale-95",
          sfx ? "bg-accent text-accent-foreground pixel-border-cyan" : "bg-surface-2 text-muted-foreground",
        )}
      >
        {sfx ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={toggleMusic}
        aria-pressed={music}
        aria-label={music ? "Desativar trilha sonora" : "Ativar trilha sonora"}
        title={music ? "Trilha: ligada" : "Trilha: desligada"}
        className={cn(
          "pixel-border grid h-10 w-10 shrink-0 place-items-center transition-transform active:scale-95",
          music ? "bg-primary text-primary-foreground pixel-border-magenta" : "bg-surface-2 text-muted-foreground",
        )}
      >
        {music ? <Music4 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
      </button>
    </div>
  );
}
