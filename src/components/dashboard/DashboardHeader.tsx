import { Link } from "@tanstack/react-router";
import { LogOut, Crown, Gamepad2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { AvatarPickerDialog } from "@/components/dashboard/AvatarPickerDialog";
import type { Profile } from "@/types/arcade";
import { levelProgress } from "@/lib/gamification/levels";

export function DashboardHeader({ profile, onSignOut }: { profile: Profile | null; onSignOut: () => void }) {
  const email = useAuthStore((s) => s.user?.email) ?? "";
  const updateAvatar = useAuthStore((s) => s.updateAvatar);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const username = profile?.username ?? email.split("@")[0] ?? "Player";
  const progress = levelProgress(profile?.xp ?? 0, profile?.level ?? 1);
  const premium = profile?.plano_status === "premium";

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

  return (
    <header className="glass flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Trocar foto de perfil"
        className="border-accent/40 hover:border-primary/70 group relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border shadow-[0_0_22px_-10px_var(--neon-cyan)] transition-colors"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={`Avatar de ${username}`} className="h-full w-full object-cover" />
        ) : (
          <Gamepad2 className="text-accent h-5 w-5" strokeWidth={1.1} />
        )}
        <span className="bg-background/70 absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Pencil className="text-primary h-3.5 w-3.5" strokeWidth={1.6} />
        </span>
      </button>

      <AvatarPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        current={profile?.avatar_url ?? null}
        onSelect={(url) => void handleSelect(url)}
        pending={pending}
      />


      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold tracking-wide">{username}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-muted-foreground text-[11px]">Nv {progress.level}</span>
          <div className="bg-surface-2 h-1 w-20 overflow-hidden rounded-full sm:w-40">
            <div className="bg-accent h-full rounded-full" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="text-muted-foreground hidden text-[11px] sm:inline">
            {progress.xpInLevel}/{progress.xpNeeded} XP
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/upgrade"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors ${
            premium
              ? "border-neon-yellow/60 text-neon-yellow"
              : "border-accent/40 text-accent hover:border-accent/70"
          }`}
        >
          <Crown className="h-3 w-3" strokeWidth={1.4} />
          {premium ? "Player PRO" : "Player 1"}
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sair"
          className="border-foreground/15 text-muted-foreground hover:text-primary hover:border-primary/40 grid h-9 w-9 place-items-center rounded-full border transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.3} />
        </button>
      </div>
    </header>
  );
}
