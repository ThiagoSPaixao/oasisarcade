import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useGameStore } from "@/stores/game-store";
import type { ActionButton, Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

function DirButton({
  direction,
  compact,
  children,
}: {
  direction: Direction;
  compact?: boolean | undefined;
  children: React.ReactNode;
}) {
  const pressDirection = useGameStore((s) => s.pressDirection);
  return (
    <button
      type="button"
      aria-label={direction}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        pressDirection(direction);
      }}
      className={cn(
        "border-accent/35 text-accent bg-surface/40 hover:border-accent/60 grid shrink-0 touch-none place-items-center rounded-full border backdrop-blur transition-all select-none active:scale-95",
        compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-11 w-11 sm:h-13 sm:w-13",
      )}
    >
      {children}
    </button>
  );
}

function ActBtn({
  action,
  label,
  compact,
}: {
  action: ActionButton;
  label: string;
  compact?: boolean | undefined;
}) {
  const pressAction = useGameStore((s) => s.pressAction);
  return (
    <button
      type="button"
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        pressAction(action);
      }}
      className={cn(
        "bg-surface/40 grid shrink-0 touch-none place-items-center rounded-full border text-xs font-bold tracking-wide backdrop-blur transition-transform select-none active:scale-95",
        compact ? "h-10 w-10 sm:h-11 sm:w-11" : "h-12 w-12 sm:h-14 sm:w-14",
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
export function DPad({ className, compact }: { className?: string; compact?: boolean }) {
  const icon = compact ? "h-4 w-4" : "h-5 w-5";
  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "border-foreground/10 bg-surface/35 flex w-full touch-none items-center justify-between gap-3 rounded-3xl border backdrop-blur-xl select-none",
        compact ? "gap-3 p-2.5 sm:p-3" : "p-4 sm:gap-6 sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "grid shrink-0 grid-cols-3 grid-rows-3 place-items-center",
          compact ? "gap-0.5" : "gap-1 sm:gap-1.5",
        )}
      >
        <span />
        <DirButton direction="up" compact={compact}>
          <ChevronUp className={icon} strokeWidth={1.2} />
        </DirButton>
        <span />
        <DirButton direction="left" compact={compact}>
          <ChevronLeft className={icon} strokeWidth={1.2} />
        </DirButton>
        <span />
        <DirButton direction="right" compact={compact}>
          <ChevronRight className={icon} strokeWidth={1.2} />
        </DirButton>
        <span />
        <DirButton direction="down" compact={compact}>
          <ChevronDown className={icon} strokeWidth={1.2} />
        </DirButton>
        <span />
      </div>
      <div className={cn("flex shrink-0 items-center", compact ? "gap-2" : "gap-2 sm:gap-3")}>
        <ActBtn action="b" label="B" compact={compact} />
        <ActBtn action="a" label="A" compact={compact} />
      </div>
    </div>
  );
}
