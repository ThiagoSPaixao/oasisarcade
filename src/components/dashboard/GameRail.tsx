import type { ReactNode } from "react";

export function GameRail({ title, children, empty }: { title: string; children: ReactNode; empty?: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="ui-label glow-cyan text-accent mb-3 text-sm">{title}</h2>
      {empty ? (
        <p className="text-muted-foreground panel bg-surface/50 p-4 text-xs">
          Nada por aqui ainda. Toque no coração de um jogo para favoritar.
        </p>
      ) : (
        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">{children}</div>
      )}
    </section>
  );
}
