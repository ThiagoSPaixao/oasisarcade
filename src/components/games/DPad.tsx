import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useGameStore } from "@/stores/game-store";
import type { ActionButton, Direction } from "@/types/arcade";
import { cn } from "@/lib/utils";

function DirButton({
  direction,
  className,
  children,
}: {
  direction: Direction;
  className?: string;
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
      className={cn(
        "pixel-border-cyan bg-surface-2 text-accent flex h-14 w-14 items-center justify-center transition-transform active:scale-95",
        className,
      )}
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
        "ui-label flex h-16 w-16 items-center justify-center rounded-full text-xs transition-transform active:scale-95",
        action === "a"
          ? "bg-primary text-primary-foreground pixel-border-magenta rounded-full"
          : "bg-accent text-accent-foreground pixel-border-cyan rounded-full",
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
        "bg-surface/80 pixel-border flex w-full items-center justify-between gap-6 p-4 backdrop-blur",
        className,
      )}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <span />
        <DirButton direction="up">
          <ChevronUp className="h-6 w-6" />
        </DirButton>
        <span />
        <DirButton direction="left">
          <ChevronLeft className="h-6 w-6" />
        </DirButton>
        <span />
        <DirButton direction="right">
          <ChevronRight className="h-6 w-6" />
        </DirButton>
        <span />
        <DirButton direction="down">
          <ChevronDown className="h-6 w-6" />
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
