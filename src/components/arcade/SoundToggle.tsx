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
          "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-transform active:scale-95",
          sfx
            ? "bg-accent/15 text-accent border-accent/50"
            : "bg-surface/40 text-muted-foreground border-border/60",
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
          "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-transform active:scale-95",
          music
            ? "bg-primary/15 text-primary border-primary/50"
            : "bg-surface/40 text-muted-foreground border-border/60",
        )}
      >
        {music ? <Music4 className="h-4 w-4" /> : <Music className="h-4 w-4" />}
      </button>
    </div>
  );
}
