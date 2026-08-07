import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useGameStore } from "@/stores/game-store";
import type { ActionButton, Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

function DirButton({
  direction,
  children,
}: {
  direction: Direction;
  children: React.ReactNode;
}) {
  const pressDirection = useGameStore((s) => s.pressDirection);
  return (
    <button
      type="button"
      aria-label={direction}
      onPointerDown={(event) => {
        event.preventDefault();
        pressDirection(direction);
      }}
      className="border-accent/35 text-accent bg-surface/40 hover:border-accent/60 grid h-11 w-11 shrink-0 place-items-center rounded-full border backdrop-blur transition-all active:scale-95 sm:h-13 sm:w-13"
    >
      {children}
    </button>
  );
}

function ActBtn({ action, label }: { action: ActionButton; label: string }) {
  const pressAction = useGameStore((s) => s.pressAction);
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        pressAction(action);
      }}
      className={cn(
        "bg-surface/40 grid h-14 w-14 place-items-center rounded-full border text-xs font-bold tracking-wide backdrop-blur transition-transform active:scale-95",
        action === "a"
          ? "border-primary/50 text-primary shadow-[0_0_24px_-10px_var(--neon-magenta)]"
          : "border-accent/50 text-accent shadow-[0_0_24px_-10px_var(--neon-cyan)]",
      )}
    >
      {label}
    </button>
  );
}

/** Virtual D-Pad: emits directional + A/B events to the active game through the game store. */
export function DPad({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-foreground/10 bg-surface/35 flex w-full items-center justify-between gap-6 rounded-3xl border p-5 backdrop-blur-xl",
        className,
      )}
    >
      <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-1.5">
        <span />
        <DirButton direction="up">
          <ChevronUp className="h-5 w-5" strokeWidth={1.2} />
        </DirButton>
        <span />
        <DirButton direction="left">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.2} />
        </DirButton>
        <span />
        <DirButton direction="right">
          <ChevronRight className="h-5 w-5" strokeWidth={1.2} />
        </DirButton>
        <span />
        <DirButton direction="down">
          <ChevronDown className="h-5 w-5" strokeWidth={1.2} />
        </DirButton>
        <span />
      </div>
      <div className="flex items-center gap-3">
        <ActBtn action="b" label="B" />
        <ActBtn action="a" label="A" />
      </div>
    </div>
  );
}
