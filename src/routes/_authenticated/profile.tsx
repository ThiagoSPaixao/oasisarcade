import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Crown, Gamepad2, LogOut, Medal, Pencil } from "lucide-react";

import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { MobileNav } from "@/components/arcade/MobileNav";
import { AvatarPickerDialog } from "@/components/dashboard/AvatarPickerDialog";
import { PlayerProgressCard } from "@/components/dashboard/PlayerProgressCard";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { AccountPanel } from "@/components/profile/AccountPanel";
import { fetchGamificationState, GAMIFICATION_QUERY_KEY } from "@/lib/gamification/events";
import { useAuthStore } from "@/stores/auth-store";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Meu Perfil · Oásis Arcade" },
      {
        name: "description",
        content: "Seu perfil de player: nível, XP, sequência diária, conquistas e estatísticas do Oásis Arcade.",
      },
      { property: "og:title", content: "Meu Perfil · Oásis Arcade" },
      {
        property: "og:description",
        content: "Acompanhe nível, XP, streak, conquistas e estatísticas do seu player no Oásis Arcade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const updateAvatar = useAuthStore((s) => s.updateAvatar);
  const signOut = useAuthStore((s) => s.signOut);
  const email = useAuthStore((s) => s.user?.email) ?? "";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const stateQuery = useQuery({ queryKey: GAMIFICATION_QUERY_KEY, queryFn: fetchGamificationState });
  const state = stateQuery.data;
  const { isPremium: premium, subscription } = useSubscription();
  const achievements = (state?.achievements ?? []).filter((a) => !a.hidden || a.unlockedAt);
  const unlocked = achievements.filter((a) => a.unlockedAt).length;

  const handleSelect = async (url: string) => {
    setPending(true);
    try {
      await updateAvatar(url);
      setPickerOpen(false);
      toast.success("Avatar atualizado!");
    } catch {
      toast.error("Não foi possível salvar seu avatar.");
    } finally {
      setPending(false);
    }
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <ArcadeShell className="px-4 py-5 pb-28 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Voltar ao dashboard"
            className="border-foreground/15 text-muted-foreground hover:text-primary hover:border-primary/40 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.3} />
          </Link>
          <h1 className="glow-magenta text-primary truncate text-lg font-bold tracking-tight">MEU PERFIL</h1>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Sair da conta"
            className="border-foreground/15 text-muted-foreground hover:text-primary hover:border-primary/40 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.3} />
          </button>
        </div>

        <section className="glass grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="Trocar foto de perfil"
            className="border-accent/40 hover:border-primary/70 group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={`Avatar de ${profile.username ?? "player"}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <Gamepad2 className="text-accent h-6 w-6" strokeWidth={1.1} />
            )}
            <span className="bg-background/70 absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
              <Pencil className="text-primary h-4 w-4" strokeWidth={1.6} />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-foreground truncate text-base font-semibold">{profile?.username ?? "Player"}</p>
            <p className="text-muted-foreground truncate text-[11px]">{email}</p>
            <Link
              to="/premium"
              aria-label={premium ? "Seu plano: Oásis Premium" : "Conhecer o Oásis Premium"}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                premium ? "border-neon-yellow/60 text-neon-yellow" : "border-accent/40 text-accent"
              }`}
            >
              <Crown className="h-3 w-3" strokeWidth={1.4} />
              {premium
                ? subscription.isComped
                  ? "Oásis Premium · Cortesia"
                  : `Oásis Premium · ${subscription.interval === "yearly" ? "Anual" : "Mensal"}`
                : "Plano gratuito · Conhecer Premium"}
            </Link>
          </div>
        </section>

        <AvatarPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          current={profile?.avatar_url ?? null}
          onSelect={(url) => void handleSelect(url)}
          pending={pending}
        />

        {stateQuery.isError ? (
          <p className="border-primary/30 text-muted-foreground mt-3 rounded-2xl border px-4 py-3 text-xs">
            Não foi possível carregar seus dados. Tente novamente em instantes.
          </p>
        ) : null}

        <PlayerProgressCard profile={profile} state={state} loading={stateQuery.isLoading} />
        <StreakCard stats={state?.stats} />

        <Link
          to="/achievements"
          className="border-neon-green/30 bg-surface-2/40 mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3.5"
        >
          <span className="border-neon-green/40 text-neon-green grid h-10 w-10 shrink-0 place-items-center rounded-full border">
            <Medal className="h-5 w-5" strokeWidth={1.4} />
          </span>
          <span className="min-w-0">
            <span className="text-foreground block text-sm font-semibold">Conquistas</span>
            <span className="text-muted-foreground block text-[11px]">
              {unlocked} de {achievements.length} desbloqueadas
            </span>
          </span>
          <span className="text-primary shrink-0 text-[11px] font-semibold">VER</span>
        </Link>

        <StatsPanel state={state} />
        <AccountPanel email={email} />
      </div>
      <MobileNav />
    </ArcadeShell>
  );
}
