import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { GamePlayer } from "@/components/games/GamePlayer";
import { PremiumLock } from "@/components/premium/PremiumLock";
import { fetchBestScore, fetchGame, saveScoreIfRecord, startGameSession } from "@/lib/arcade-api";
import { dispatchGamificationEvent, GAMIFICATION_QUERY_KEY } from "@/lib/gamification/events";
import { celebrateOutcome } from "@/lib/gamification/feedback";
import { resolveSlug } from "@/lib/games/catalog";
import { authorizeGameAccessSecure } from "@/lib/subscription.functions";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/_authenticated/game/$slug")({
  component: GameRoute,
});

function GameRoute() {
  const params = Route.useParams();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { access, isLoading: planLoading } = useSubscription();

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

  // Decisão local só define o que renderizar; a autorização real vem do servidor.
  const localAccess = access(game);
  const authQuery = useQuery({
    queryKey: ["game-access", slug],
    queryFn: () => authorizeGameAccessSecure({ data: { slug: slug as string } }),
    enabled: knownSlug && !!game?.is_premium,
    staleTime: 60_000,
  });

  const authorized = game?.is_premium ? authQuery.data === true : localAccess.allowed;
  const checking =
    gameQuery.isLoading || planLoading || (!!game?.is_premium && authQuery.isLoading);

  // Sessão da partida emitida pelo servidor: sem ela nenhuma pontuação/XP é aceito.
  const sessionRef = useRef<string | null>(null);
  const openSession = useCallback(async () => {
    if (!slug || !authorized) return;
    sessionRef.current = await startGameSession(slug);
  }, [slug, authorized]);

  useEffect(() => {
    void openSession();
  }, [openSession]);

  const onGameOver = async (score: number) => {
    if (!slug) return;
    const sessionId = sessionRef.current;
    if (!sessionId) {
      toast.error("Sessão de jogo expirada. Recarregue a página.");
      return;
    }
    try {
      const isRecord = await saveScoreIfRecord(slug, score, sessionId);

      if (isRecord) {
        toast.success(`Novo recorde: ${score} pontos!`);
        await queryClient.invalidateQueries({ queryKey: ["best", slug] });
        await queryClient.invalidateQueries({ queryKey: ["scores"] });
      }
      // Gamificação: XP da partida, streak, desafio diário e conquistas — tudo server-side.
      const outcome = await dispatchGamificationEvent({ type: "game_over", slug, sessionId, score, isRecord });
      if (outcome) {
        celebrateOutcome(outcome);
        if (profile) setProfile({ ...profile, xp: outcome.xp, level: outcome.level });
        await queryClient.invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEY });
      }
    } catch {
      toast.error("Não foi possível salvar sua pontuação.");
    } finally {
      // Próxima partida começa com uma sessão nova.
      await openSession();
    }
  };

  return (
    <ArcadeShell className="game-screen px-3 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        {!knownSlug ? (
          <p className="ui-label text-primary text-xs">JOGO NÃO ENCONTRADO</p>
        ) : checking ? (
          <p className="ui-label text-accent text-xs">CARREGANDO...</p>
        ) : !game ? (
          <p className="ui-label text-primary text-xs">JOGO NÃO ENCONTRADO</p>
        ) : !authorized ? (
          // Motor do jogo nem é montado sem autorização.
          <PremiumLock gameName={game.name} />
        ) : (
          <GamePlayer game={game} best={bestQuery.data ?? 0} onGameOver={(score) => void onGameOver(score)} />
        )}
      </div>
    </ArcadeShell>
  );
}
