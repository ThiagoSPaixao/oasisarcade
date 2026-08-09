import { Gauge, Ghost, Settings2, SquareDashed } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useGameOptions, useSettingsStore } from "@/stores/settings-store";
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/game-options";
import { cn } from "@/lib/utils";

const DIFFICULTY_HINT: Record<string, string> = {
  snake: "Quanto mais rápida a cobra, mais pontos por fruta.",
  tetris: "Peças caem mais rápido e cada linha vale mais.",
  "space-shooter": "Frota mais veloz e mais tiros inimigos.",
  nave: "Frota mais veloz e mais tiros inimigos.",
  breakout: "Bola mais rápida e raquete menor.",
  arkanoid: "Bola mais rápida e raquete menor.",
  pong: "Bola mais rápida e CPU mais esperta.",
  memoria: "Mais pares para encontrar no tabuleiro.",
};

function Row({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="text-accent mt-0.5 shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground block text-[11px] leading-snug">{hint}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

/** Configurações específicas do jogo aberto (dificuldade e opções próprias). */
export function GameSettingsMenu({ slug, className }: { slug: string; className?: string }) {
  const options = useGameOptions(slug);
  const setGameOption = useSettingsStore((s) => s.setGameOption);

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Configurações do jogo"
        className={cn(
          "border-accent/40 text-accent bg-surface/40 hover:border-accent/70 grid h-9 w-9 shrink-0 place-items-center rounded-full border backdrop-blur transition-transform active:scale-95",
          className,
        )}
      >
        <Settings2 className="h-4 w-4" strokeWidth={1.4} />
      </SheetTrigger>
      <SheetContent side="right" className="bg-background/85 w-[88vw] max-w-sm backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="glow-magenta text-primary text-base font-bold">
            AJUSTES DESTE JOGO
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Só valem para este jogo. Mudar a dificuldade reinicia a partida.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-6">
          <div className="glass px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-accent mt-0.5 shrink-0">
                <Gauge className="h-4 w-4" strokeWidth={1.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Dificuldade</span>
                <span className="text-muted-foreground block text-[11px] leading-snug">
                  {DIFFICULTY_HINT[slug] ?? "Mais desafio, mais pontos."}
                </span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((value: Difficulty) => {
                const meta = DIFFICULTY_META[value];
                const active = options.difficulty === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGameOption(slug, { difficulty: value })}
                    aria-pressed={active}
                    className={cn(
                      "ui-label rounded-full border px-2 py-2 text-[10px] transition-colors",
                      active
                        ? "border-primary/60 text-primary bg-primary/10"
                        : "border-foreground/15 text-muted-foreground",
                    )}
                  >
                    {meta.label}
                    <span className="text-muted-foreground/80 block text-[9px] font-normal">
                      {meta.multiplier}x
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {slug === "snake" ? (
            <Row
              icon={<SquareDashed className="h-4 w-4" strokeWidth={1.4} />}
              title="Atravessar bordas"
              hint="A cobra reaparece do outro lado em vez de bater."
            >
              <Switch
                checked={options.snakeWrap}
                onCheckedChange={(checked) => setGameOption(slug, { snakeWrap: checked })}
                aria-label="Atravessar bordas"
              />
            </Row>
          ) : null}

          {slug === "tetris" ? (
            <Row
              icon={<Ghost className="h-4 w-4" strokeWidth={1.4} />}
              title="Sombra da peça"
              hint="Mostra onde a peça vai pousar (ghost)."
            >
              <Switch
                checked={options.tetrisGhost}
                onCheckedChange={(checked) => setGameOption(slug, { tetrisGhost: checked })}
                aria-label="Sombra da peça"
              />
            </Row>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
