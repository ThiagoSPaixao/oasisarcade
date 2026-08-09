import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { GamePlayer } from "@/components/games/GamePlayer";
import { UpgradeDialog } from "@/components/upgrade/UpgradeDialog";
import { fetchBestScore, fetchGame, saveScoreIfRecord, simulateSubscription } from "@/lib/arcade-api";
import { dispatchGamificationEvent, GAMIFICATION_QUERY_KEY } from "@/lib/gamification/events";
import { celebrateOutcome } from "@/lib/gamification/feedback";
import { resolveSlug } from "@/lib/games/catalog";
import { useAuthStore } from "@/stores/auth-store";
import type { PlanStatus } from "@/types/arcade";


export const Route = createFileRoute("/_authenticated/game/$slug")({
  component: GameRoute,
});

function GameRoute() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Slug canônico do Game Registry (resolve aliases antigos como "nave"/"arkanoid").
  const slug = resolveSlug(params.slug);
  const knownSlug = slug !== null;

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const gameQuery = useQuery({
    queryKey: ["game", slug],
    queryFn: () => fetchGame(slug as string),
    enabled: knownSlug,
  });
  const bestQuery = useQuery({
    queryKey: ["best", slug],
    queryFn: () => fetchBestScore(slug as string),
    enabled: knownSlug,
  });

  const game = gameQuery.data;
  const locked = !!game?.is_premium && profile?.plano_status !== "premium";

  useEffect(() => {
    if (locked) setUpgradeOpen(true);
  }, [locked]);


  const onGameOver = async (score: number) => {
    if (!slug) return;
    try {
      const isRecord = await saveScoreIfRecord(slug, score);

      if (isRecord) {
        toast.success(`Novo recorde: ${score} pontos!`);
        await queryClient.invalidateQueries({ queryKey: ["best", slug] });
        await queryClient.invalidateQueries({ queryKey: ["scores"] });
      }
      // Gamificação: XP da partida, streak, desafio diário e conquistas — tudo server-side.
      const outcome = await dispatchGamificationEvent({ type: "game_over", slug, score, isRecord });
      if (outcome) {
        celebrateOutcome(outcome);
        if (profile) setProfile({ ...profile, xp: outcome.xp, level: outcome.level });
        await queryClient.invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEY });
      }
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
    <ArcadeShell className="game-screen px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        {!knownSlug ? (
          <p className="ui-label text-primary text-xs">JOGO NÃO ENCONTRADO</p>
        ) : gameQuery.isLoading ? (
          <p className="ui-label text-accent text-xs">CARREGANDO...</p>
        ) : !game ? (
          <p className="ui-label text-primary text-xs">JOGO NÃO ENCONTRADO</p>
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
