import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Placeholder neon consistente, usado quando o jogo não tem capa ou a imagem falha ao carregar. */
export function GameCoverFallback({ name, className }: { name: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Capa indisponível do jogo ${name}`}
      className={cn(
        "arcade-grid from-surface-2 to-background grid h-full w-full place-content-center gap-2 justify-items-center bg-gradient-to-br px-3",
        className,
      )}
    >
      <span className="border-accent/40 text-accent grid h-9 w-9 place-items-center rounded-full border">
        <Gamepad2 className="h-4 w-4" strokeWidth={1.4} />
      </span>
      <span className="glow-magenta text-primary text-center text-[11px] font-semibold tracking-[0.16em]">
        {name.toUpperCase()}
      </span>
    </div>
  );
}

/** Capa do jogo com fallback automático para o placeholder neon em caso de erro de carregamento. */
export function GameCover({
  src,
  name,
  width,
  height,
  className,
}: {
  src: string | null;
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <GameCoverFallback name={name} className={className} />;

  return (
    <img
      src={src}
      alt={`Capa do jogo ${name}`}
      loading="lazy"
      width={width}
      height={height}
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
