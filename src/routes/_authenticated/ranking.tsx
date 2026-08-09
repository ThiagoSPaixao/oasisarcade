import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { fetchGames, fetchLeaderboard, type LeaderboardRow } from "@/lib/arcade-api";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/ranking")({
  component: RankingPage,
  head: () => ({
    meta: [
      { title: "Ranking Global · Oásis Arcade" },
      {
        name: "description",
        content: "Veja o ranking global de cada jogo do Oásis Arcade e dispute o topo com outros players.",
      },
      { property: "og:title", content: "Ranking Global · Oásis Arcade" },
      {
        property: "og:description",
        content: "As melhores pontuações de cada jogo retrô do Oásis Arcade, atualizadas em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RankingPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [slug, setSlug] = useState<string | null>(null);

  const gamesQuery = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const games = gamesQuery.data ?? [];
  const activeSlug = slug ?? games[0]?.slug ?? null;

  const boardQuery = useQuery({
    queryKey: ["leaderboard", activeSlug],
    queryFn: () => fetchLeaderboard(activeSlug as string),
    enabled: !!activeSlug,
  });



  const rows: LeaderboardRow[] = boardQuery.data ?? [];


  return (
    <ArcadeShell className="px-4 py-5 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.3} /> Voltar
          </Link>
          <span className="text-accent inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em]">
            <Trophy className="h-4 w-4" strokeWidth={1.3} /> RANKING GLOBAL
          </span>
        </div>

        <h1 className="text-foreground text-2xl font-bold tracking-tight">Ranking Global</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          As melhores pontuações de todos os players cadastrados, jogo por jogo.
        </p>

        <div className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {games.map((game) => (
            <button
              key={game.slug}
              type="button"
              onClick={() => setSlug(game.slug)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors",
                game.slug === activeSlug
                  ? "border-accent/70 text-accent bg-accent/10"
                  : "border-foreground/10 text-muted-foreground",
              )}
            >
              {game.name}
            </button>
          ))}
        </div>

        <div className="glass mt-4 overflow-hidden rounded-2xl border border-accent/20">
          {boardQuery.isLoading ? (
            <p className="text-muted-foreground p-6 text-center text-xs">Carregando ranking...</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-xs">
              Ninguém pontuou neste jogo ainda. Seja o primeiro!
            </p>
          ) : (
            <ul className="divide-foreground/5 divide-y">
              {rows.map((row) => (
                <li
                  key={row.user_id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    row.user_id === userId && "bg-primary/10",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-bold",
                      row.rank === 1
                        ? "border-neon-yellow/60 text-neon-yellow"
                        : "border-foreground/10 text-muted-foreground",
                    )}
                  >
                    {row.rank === 1 ? <Crown className="h-4 w-4" strokeWidth={1.4} /> : row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {row.username}
                      {row.user_id === userId ? (
                        <span className="text-primary ml-2 text-[10px] font-bold">VOCÊ</span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-[11px]">Level {row.level}</p>
                  </div>
                  <span className="text-accent text-sm font-bold tabular-nums">{row.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ArcadeShell>
  );
}
