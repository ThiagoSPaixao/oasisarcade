import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyBanner } from "@/components/dashboard/DailyBanner";
import { GameRail } from "@/components/dashboard/GameRail";
import { GameCard } from "@/components/dashboard/GameCard";
import { fetchFavorites, fetchGames, fetchScores, toggleFavorite } from "@/lib/arcade-api";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const gamesQuery = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const favoritesQuery = useQuery({ queryKey: ["favorites"], queryFn: fetchFavorites });
  const scoresQuery = useQuery({ queryKey: ["scores"], queryFn: fetchScores });

  const games = gamesQuery.data ?? [];
  const favorites = favoritesQuery.data ?? [];
  const scores = scoresQuery.data ?? {};
  const isPremiumUser = profile?.plano_status === "premium";
  const daily = games[0];

  const onToggleFavorite = async (slug: string) => {
    const isFavorite = favorites.includes(slug);
    try {
      await toggleFavorite(slug, isFavorite);
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch {
      toast.error("Não foi possível atualizar seus favoritos.");
    }
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  const renderCards = (list: typeof games) =>
    list.map((game) => (
      <GameCard
        key={game.slug}
        game={game}
        best={scores[game.slug] ?? 0}
        isFavorite={favorites.includes(game.slug)}
        locked={game.is_premium && !isPremiumUser}
        onToggleFavorite={() => void onToggleFavorite(game.slug)}
      />
    ));

  return (
    <ArcadeShell className="px-4 py-5 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <DashboardHeader profile={profile} onSignOut={() => void handleSignOut()} />

        {daily ? <DailyBanner game={daily} /> : null}

        <GameRail title="MAIS JOGADOS">
          {renderCards(games.filter((game) => game.category === "mais_jogados"))}
        </GameRail>

        <GameRail title="CLÁSSICOS 8-BITS">
          {renderCards(games.filter((game) => game.category === "classicos_8bits"))}
        </GameRail>

        <GameRail title="MEUS FAVORITOS" empty={favorites.length === 0}>
          {renderCards(games.filter((game) => favorites.includes(game.slug)))}
        </GameRail>
      </div>
    </ArcadeShell>
  );
}
