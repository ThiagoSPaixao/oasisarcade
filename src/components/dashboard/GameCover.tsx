import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cache em memória do estado das capas já resolvidas nesta sessão (evita re-flash e recarga no mobile). */
const coverStatus = new Map<string, "loaded" | "failed">();

/** Pré-carrega uma capa (usado para os slides vizinhos do carrossel). */
export function preloadCover(src: string | null | undefined) {
  if (!src || coverStatus.has(src) || typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => coverStatus.set(src, "loaded");
  img.onerror = () => coverStatus.set(src, "failed");
  img.src = src;
}

/** Placeholder neon consistente, usado quando o jogo não tem capa ou a imagem falha ao carregar. */
export function GameCoverFallback({
  name,
  label,
  className,
}: {
  name: string;
  label?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      role="img"
      aria-label={label ?? `Capa indisponível do jogo ${name}. Placeholder do Oásis Arcade.`}
      className={cn(
        "arcade-grid from-surface-2 to-background grid h-full w-full place-content-center gap-2 justify-items-center bg-gradient-to-br px-3",
        className,
      )}
    >
      <span aria-hidden="true" className="border-accent/40 text-accent grid h-9 w-9 place-items-center rounded-full border">
        <Gamepad2 className="h-4 w-4" strokeWidth={1.4} />
      </span>
      <span
        aria-hidden="true"
        className="glow-magenta text-primary text-center text-[11px] font-semibold tracking-[0.16em]"
      >
        {name.toUpperCase()}
      </span>
    </div>
  );
}

/** Capa do jogo com lazy loading, cache de sessão e fallback automático para o placeholder neon. */
export function GameCover({
  src,
  name,
  width,
  height,
  className,
  priority = false,
  alt,
}: {
  src: string | null;
  name: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  /** Texto alternativo customizado; por padrão descreve a capa do jogo. */
  alt?: string;
}) {
  const cached = src ? coverStatus.get(src) : undefined;
  const [failed, setFailed] = useState(cached === "failed");
  const [loaded, setLoaded] = useState(cached === "loaded");
  const description = alt ?? `Capa do jogo ${name} em arte neon 8-bit`;

  useEffect(() => {
    const status = src ? coverStatus.get(src) : undefined;
    setFailed(status === "failed");
    setLoaded(status === "loaded");
  }, [src]);

  if (!src || failed) {
    return (
      <GameCoverFallback
        name={name}
        label={`Capa indisponível do jogo ${name}. Placeholder do Oásis Arcade.`}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={description}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      width={width}
      height={height}
      onLoad={() => {
        coverStatus.set(src, "loaded");
        setLoaded(true);
      }}
      onError={() => {
        coverStatus.set(src, "failed");
        setFailed(true);
      }}
      className={cn(
        "h-full w-full object-cover transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
