import { Link } from "@tanstack/react-router";
import { LogOut, Crown, Gamepad2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { XP_PER_LEVEL, type Profile } from "@/types/arcade";

export function DashboardHeader({ profile, onSignOut }: { profile: Profile | null; onSignOut: () => void }) {
  const email = useAuthStore((s) => s.user?.email) ?? "";
  const username = profile?.username ?? email.split("@")[0] ?? "Player";
  const xpInLevel = (profile?.xp ?? 0) % XP_PER_LEVEL;
  const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
  const premium = profile?.plano_status === "premium";

  return (
    <header className="bg-surface/70 pixel-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 backdrop-blur sm:flex sm:flex-wrap sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-surface-2 pixel-border-magenta grid h-12 w-12 shrink-0 place-items-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={`Avatar de ${username}`} className="h-full w-full object-cover" />
          ) : (
            <Gamepad2 className="text-primary h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-pixel glow-cyan text-accent truncate text-[11px] sm:text-xs">{username}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground text-[10px] uppercase">Nv {profile?.level ?? 1}</span>
            <div className="bg-surface-2 h-2 w-24 overflow-hidden sm:w-36">
              <div className="bg-neon-green h-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-muted-foreground text-[10px]">
              {xpInLevel}/{XP_PER_LEVEL} XP
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/upgrade"
          className={`font-pixel flex items-center gap-1 px-2 py-2 text-[9px] ${
            premium
              ? "bg-neon-yellow text-primary-foreground pixel-border"
              : "text-accent pixel-border-cyan bg-transparent"
          }`}
        >
          <Crown className="h-3 w-3" />
          {premium ? "PLAYER 2" : "PLAYER 1"}
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sair"
          className="text-muted-foreground pixel-border hover:text-primary grid h-9 w-9 place-items-center"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
