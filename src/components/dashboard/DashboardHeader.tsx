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
    <header className="glass flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
      <div className="border-accent/40 grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border shadow-[0_0_22px_-10px_var(--neon-cyan)]">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={`Avatar de ${username}`} className="h-full w-full object-cover" />
        ) : (
          <Gamepad2 className="text-accent h-5 w-5" strokeWidth={1.1} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold tracking-wide">{username}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-muted-foreground text-[11px]">Nv {profile?.level ?? 1}</span>
          <div className="bg-surface-2 h-1 w-20 overflow-hidden rounded-full sm:w-40">
            <div className="bg-accent h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-muted-foreground hidden text-[11px] sm:inline">
            {xpInLevel}/{XP_PER_LEVEL} XP
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
