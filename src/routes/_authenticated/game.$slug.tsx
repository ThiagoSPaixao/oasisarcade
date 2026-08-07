import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { GamePlayer } from "@/components/games/GamePlayer";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";
import { fetchBestScore, fetchGame, grantXp, saveScoreIfRecord, simulateSubscription } from "@/lib/arcade-api";
import { useAuthStore } from "@/stores/auth-store";
import type { PlanStatus } from "@/types/arcade";

export const Route = createFileRoute("/_authenticated/game/$slug")({
  component: GameRoute,
});

function GameRoute() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const gameQuery = useQuery({ queryKey: ["game", slug], queryFn: () => fetchGame(slug) });
  const bestQuery = useQuery({ queryKey: ["best", slug], queryFn: () => fetchBestScore(slug) });

  const game = gameQuery.data;
  const locked = !!game?.is_premium && profile?.plano_status !== "premium";

  useEffect(() => {
    if (locked) setUpgradeOpen(true);
  }, [locked]);

  const onGameOver = async (score: number) => {
    try {
      const isRecord = await saveScoreIfRecord(slug, score);
      if (isRecord) {
        toast.success(`Novo recorde: ${score} pontos!`);
        await queryClient.invalidateQueries({ queryKey: ["best", slug] });
        await queryClient.invalidateQueries({ queryKey: ["scores"] });
      }
      const xp = Math.max(1, Math.floor(score / 10)) * (profile?.plano_status === "premium" ? 2 : 1);
      const updated = await grantXp(xp);
      if (updated) setProfile(updated);
    } catch {
      toast.error("Não foi possível salvar sua pontuação.");
    }
  };

  const onSelectPlan = async (plan: PlanStatus) => {
    setPending(true);
    try {
      const updated = await simulateSubscription(plan);
      if (updated) setProfile(updated);
      toast.success(plan === "premium" ? "Player 2 ativado! Aproveite." : "Você voltou para o plano grátis.");
      if (plan === "premium") setUpgradeOpen(false);
      else navigate({ to: "/dashboard" });
    } catch {
      toast.error("Não foi possível atualizar seu plano.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ArcadeShell className="px-4 py-5 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        {gameQuery.isLoading ? (
          <p className="font-pixel text-accent text-xs">CARREGANDO...</p>
        ) : !game ? (
          <p className="font-pixel text-primary text-xs">JOGO NÃO ENCONTRADO</p>
        ) : (
          <GamePlayer game={game} best={bestQuery.data ?? 0} onGameOver={(score) => void onGameOver(score)} />
        )}
      </div>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={(open) => {
          setUpgradeOpen(open);
          if (!open && locked) navigate({ to: "/dashboard" });
        }}
        current={profile?.plano_status ?? "free"}
        onSelect={(plan) => void onSelectPlan(plan)}
        pending={pending}
      />
    </ArcadeShell>
  );
}
