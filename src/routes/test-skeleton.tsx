import { createFileRoute } from "@tanstack/react-router";
import { GameCover } from "@/components/dashboard/GameCover";
import { gameCover } from "@/lib/game-covers";

export const Route = createFileRoute("/test-skeleton")({
  component: TestSkeleton,
});

function TestSkeleton() {
  return (
    <div className="bg-background min-h-dvh p-8">
      <h1 className="text-foreground mb-4 text-lg font-bold">Skeleton Test</h1>
      <div className="relative aspect-[16/10] w-full max-w-md overflow-hidden rounded-2xl bg-surface-2">
        <GameCover src={gameCover("tetris", null)} name="Tetris" width={768} height={480} />
      </div>
    </div>
  );
}
