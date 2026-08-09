import { useCallback, useEffect, useRef, useState } from "react";
import { Gamepad2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cache em memória do estado das capas já resolvidas nesta sessão (evita re-flash e recarga no mobile). */
const coverStatus = new Map<string, "loaded" | "failed">();

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

/** Pré-carrega uma capa (usado para os slides vizinhos do carrossel). */
export function preloadCover(src: string | null | undefined) {
  if (!src || coverStatus.has(src) || typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.onload = () => coverStatus.set(src, "loaded");
  img.onerror = () => coverStatus.set(src, "failed");
  img.src = src;
}

/** Skeleton animado neon exibido enquanto a capa carrega. */
function GameCoverSkeleton({
  label,
  className,
  retrying,
}: {
  label: string;
  className?: string;
  retrying?: boolean;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      role="status"
      className={cn(
        "skeleton-shimmer absolute inset-0 z-10 grid place-items-center justify-items-center gap-2 overflow-hidden",
        className,
      )}
    >
      <span className="border-accent/30 text-accent/60 grid h-10 w-10 place-items-center rounded-full border">
        {retrying ? (
          <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={1.3} />
        ) : (
          <Gamepad2 className="h-5 w-5" strokeWidth={1.3} />
        )}
      </span>
    </div>
  );
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

/** Capa do jogo com lazy loading, cache de sessão, skeleton animado, fallback e retry automático. */
export function GameCover({
  src,
  name,
  width,
  height,
  className,
  priority = false,
  alt,
  sizes,
}: {
  src: string | null;
  name: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  /** Texto alternativo customizado; por padrão descreve a capa do jogo. */
  alt?: string;
  /** Tamanho responsivo para o atributo `sizes` (evita carregar imagens maiores que o necessário). */
  sizes?: string;
}) {
  const cachedLoaded = src ? coverStatus.get(src) === "loaded" : false;
  const [loaded, setLoaded] = useState(cachedLoaded);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const description = alt ?? `Capa do jogo ${name} em arte neon 8-bit`;

  const markLoaded = useCallback((url: string) => {
    coverStatus.set(url, "loaded");
    setLoaded(true);
    setFailed(false);
  }, []);

  const attemptRetry = useCallback(() => {
    setRetry((r) => r + 1);
  }, []);

  const handleError = useCallback(() => {
    if (!src) return;
    if (retry < MAX_RETRIES) {
      retryTimer.current = setTimeout(attemptRetry, RETRY_DELAY_MS);
    } else {
      coverStatus.set(src, "failed");
      setFailed(true);
    }
  }, [retry, src, attemptRetry]);

  useEffect(() => {
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!src) {
      setFailed(false);
      setLoaded(false);
      return;
    }
    setFailed(false);
    setLoaded(coverStatus.get(src) === "loaded");

    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        markLoaded(src);
      } else {
        handleError();
      }
    }
  }, [src, retry, markLoaded, handleError]);

  if (!src || failed) {
    return (
      <GameCoverFallback
        name={name}
        label={`Capa indisponível do jogo ${name}. Placeholder do Oásis Arcade.`}
        className={className}
      />
    );
  }

  const actualSrc = retry > 0 ? `${src}?retry=${retry}` : src;
  const retrying = retry > 0 && !loaded;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {!loaded && <GameCoverSkeleton label={`Carregando capa do jogo ${name}...`} retrying={retrying} />}
      <img
        ref={imgRef}
        src={actualSrc}
        alt={description}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        width={width}
        height={height}
        onLoad={() => {
          if (src) markLoaded(src);
        }}
        onError={handleError}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
