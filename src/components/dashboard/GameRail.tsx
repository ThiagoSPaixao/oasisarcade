import type { ReactNode } from "react";

export function GameRail({
  title,
  children,
  empty,
  emptyMessage,
  action,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  action?: ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="ui-label glow-cyan text-accent min-w-0 truncate text-sm">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {empty ? (
        <p className="text-muted-foreground panel bg-surface/50 p-4 text-xs leading-relaxed">
          {emptyMessage ?? "Nada por aqui ainda. Toque no coração de um jogo para favoritar."}
        </p>
      ) : (
        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">{children}</div>
      )}
    </section>
  );
}
