import { Gamepad2, Moon, Music4, Settings, Sun, Volume2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useSoundStore } from "@/stores/sound-store";
import { useSettingsStore, type ControlMode } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

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

/** Menu de configurações: som, efeitos, tema e modo de controle. */
export function SettingsMenu({ className }: { className?: string }) {
  const sfx = useSoundStore((s) => s.sfx);
  const music = useSoundStore((s) => s.music);
  const toggleSfx = useSoundStore((s) => s.toggleSfx);
  const toggleMusic = useSoundStore((s) => s.toggleMusic);

  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const controlMode = useSettingsStore((s) => s.controlMode);
  const setControlMode = useSettingsStore((s) => s.setControlMode);

  const modes: { value: ControlMode; label: string }[] = [
    { value: "dpad", label: "Setas" },
    { value: "analog", label: "Analógico" },
  ];

  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir configurações"
        className={cn(
          "border-accent/40 text-accent bg-surface/40 hover:border-accent/70 grid h-10 w-10 shrink-0 place-items-center rounded-full border backdrop-blur transition-transform active:scale-95",
          className,
        )}
      >
        <Settings className="h-4 w-4" strokeWidth={1.4} />
      </SheetTrigger>
      <SheetContent side="right" className="bg-background/85 w-[88vw] max-w-sm backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="glow-magenta text-primary text-base font-bold">CONFIGURAÇÕES</SheetTitle>
          <SheetDescription className="text-[11px]">
            Ajuste áudio, aparência e controles do arcade.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-6">
          <Row
            icon={<Volume2 className="h-4 w-4" strokeWidth={1.4} />}
            title="Efeitos sonoros"
            hint="Bipes, tiros, explosões e moedas 8-bit."
          >
            <Switch checked={sfx} onCheckedChange={toggleSfx} aria-label="Efeitos sonoros" />
          </Row>

          <Row
            icon={<Music4 className="h-4 w-4" strokeWidth={1.4} />}
            title="Trilha sonora"
            hint="Música chiptune em loop durante o jogo."
          >
            <Switch checked={music} onCheckedChange={toggleMusic} aria-label="Trilha sonora" />
          </Row>

          <Row
            icon={theme === "dark" ? <Moon className="h-4 w-4" strokeWidth={1.4} /> : <Sun className="h-4 w-4" strokeWidth={1.4} />}
            title={theme === "dark" ? "Modo escuro" : "Modo claro"}
            hint="Alterna entre o neon escuro e a versão clara."
          >
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} aria-label="Modo escuro" />
          </Row>

          <div className="glass px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-accent mt-0.5 shrink-0">
                <Gamepad2 className="h-4 w-4" strokeWidth={1.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Modo de controle</span>
                <span className="text-muted-foreground block text-[11px] leading-snug">
                  Botões de seta ou alavanca analógica virtual.
                </span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setControlMode(mode.value)}
                  aria-pressed={controlMode === mode.value}
                  className={cn(
                    "ui-label rounded-full border px-3 py-2 text-[11px] transition-colors",
                    controlMode === mode.value
                      ? "border-primary/60 text-primary bg-primary/10"
                      : "border-foreground/15 text-muted-foreground",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
