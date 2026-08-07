import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { applyTheme, useSettingsStore } from "@/stores/settings-store";

export function ArcadeShell({ children, className }: { children: ReactNode; className?: string }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className={cn("scanlines min-h-screen arcade-grid", className)}>
      <div className="crt-flicker relative z-10 h-full">{children}</div>
    </div>
  );
}

export function NeonTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn("font-pixel glow-magenta text-primary text-base sm:text-2xl", className)}>{children}</h1>
  );
}
