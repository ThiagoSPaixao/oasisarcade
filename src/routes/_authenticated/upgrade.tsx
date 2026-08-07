import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { PlanCards } from "@/components/upgrade/PlanCards";
import { simulateSubscription } from "@/lib/arcade-api";
import { useAuthStore } from "@/stores/auth-store";
import type { PlanStatus } from "@/types/arcade";

export const Route = createFileRoute("/_authenticated/upgrade")({
  component: UpgradePage,
});

function UpgradePage() {
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSelect = async (plan: PlanStatus) => {
    setPending(true);
    try {
      const updated = await simulateSubscription(plan);
      if (updated) setProfile(updated);
      toast.success(plan === "premium" ? "Player 2 ativado! Todos os jogos liberados." : "Plano grátis ativado.");
    } catch {
      toast.error("Não foi possível atualizar seu plano.");
    } finally {
      setPending(false);
    }
  };

  return (
    <ArcadeShell className="px-4 py-5 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Voltar ao dashboard"
            className="pixel-border text-muted-foreground hover:text-primary grid h-9 w-9 place-items-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="ui-label glow-magenta text-primary text-xs sm:text-base">ESCOLHA SEU PLAYER</h1>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Preços de demonstração — nenhuma cobrança real é feita. A assinatura é simulada e libera os jogos
          premium na hora.
        </p>
        <div className="mt-6">
          <PlanCards current={profile?.plano_status ?? "free"} onSelect={(plan) => void onSelect(plan)} pending={pending} />
        </div>
      </div>
    </ArcadeShell>
  );
}
