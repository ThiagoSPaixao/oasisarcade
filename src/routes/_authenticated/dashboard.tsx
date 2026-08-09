import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { SettingsMenu } from "@/components/arcade/SettingsMenu";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GameCarousel } from "@/components/dashboard/GameCarousel";
import { GameRail } from "@/components/dashboard/GameRail";
import { GameCard } from "@/components/dashboard/GameCard";
import { fetchFavorites, fetchGames, fetchScores, toggleFavorite } from "@/lib/arcade-api";
import { useAuthStore } from "@/stores/auth-store";
import { useSoundStore } from "@/stores/sound-store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const unlock = useSoundStore((s) => s.unlock);
  const play = useSoundStore((s) => s.play);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const onFirstTouch = () => unlock();
    window.addEventListener("pointerdown", onFirstTouch, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstTouch);
  }, [unlock]);

  const gamesQuery = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const favoritesQuery = useQuery({ queryKey: ["favorites"], queryFn: fetchFavorites });
  const scoresQuery = useQuery({ queryKey: ["scores"], queryFn: fetchScores });

  const games = gamesQuery.data ?? [];
  const favorites = favoritesQuery.data ?? [];
  const scores = scoresQuery.data ?? {};
  const isPremiumUser = profile?.plano_status === "premium";

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
    play("back");
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <ArcadeShell className="px-4 py-5 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between">
          <Link
            to="/ranking"
            className="border-accent/40 text-accent inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-semibold"
          >
            <Trophy className="h-3.5 w-3.5" strokeWidth={1.4} /> RANKING GLOBAL
          </Link>
          <SettingsMenu />
        </div>


        <DashboardHeader profile={profile} onSignOut={() => void handleSignOut()} />




        <GameCarousel
          games={games}
          scores={scores}
          favorites={favorites}
          isPremiumUser={isPremiumUser}
          onToggleFavorite={(slug) => void onToggleFavorite(slug)}
        />

        <GameRail title="MEUS FAVORITOS" empty={favorites.length === 0}>
          {games
            .filter((game) => favorites.includes(game.slug))
            .map((game) => (
              <GameCard
                key={game.slug}
                game={game}
                best={scores[game.slug] ?? 0}
                isFavorite
                locked={game.is_premium && !isPremiumUser}
                onToggleFavorite={() => void onToggleFavorite(game.slug)}
              />
            ))}
        </GameRail>

        <p className="ui-label text-muted-foreground mt-10 text-center text-[10px] leading-relaxed">
          OÁSIS ARCADE · DESENVOLVIDO POR{" "}
          <span className="text-neon-green">ThiagoS.Paixão</span>
        </p>
      </div>
    </ArcadeShell>
  );
}
