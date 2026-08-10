import { Link } from "@tanstack/react-router";
import { Home, Trophy, Medal, User } from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/achievements", label: "Conquistas", icon: Medal },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

/** Navegação inferior única do app autenticado (mobile-first, áreas de toque ≥ 44px). */
export function MobileNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:mb-3 sm:max-w-md sm:rounded-2xl sm:border"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="text-muted-foreground grid min-h-[56px] place-items-center gap-0.5 py-2 text-[10px] font-semibold"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
