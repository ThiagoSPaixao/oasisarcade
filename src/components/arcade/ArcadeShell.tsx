import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ArcadeShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scanlines min-h-screen arcade-grid", className)}>
      <div className="crt-flicker relative z-10">{children}</div>
    </div>
  );
}

export function NeonTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn("font-pixel glow-magenta text-primary text-lg sm:text-2xl", className)}>{children}</h1>
  );
}
