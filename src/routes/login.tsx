import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { useAuthStore } from "@/stores/auth-store";


export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Oásis Arcade" },
      { name: "description", content: "Entre na sua conta do Oásis Arcade e continue jogando os clássicos." },
      { property: "og:title", content: "Entrar — Oásis Arcade" },
      { property: "og:description", content: "Acesse sua conta do Oásis Arcade e volte para o fliperama." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);


  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await signIn(email.trim(), password);
      toast.success("Bem-vindo de volta, player!");
      navigate({ to: "/dashboard" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao entrar";
      toast.error(
        message.toLowerCase().includes("invalid") ? "E-mail ou senha incorretos." : message,
      );
    }
  };

  return (
    <ArcadeShell className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-pixel glow-magenta text-primary mb-8 text-center text-[20px] leading-tight font-normal">
          OÁSIS <span className="glow-cyan text-accent">ARCADE</span>
        </h1>
        <form
          onSubmit={onSubmit}
          className="border-accent/35 bg-surface/45 flex flex-col gap-4 rounded-2xl border p-6 shadow-[0_0_44px_-16px_color-mix(in_oklab,var(--neon-cyan)_55%,transparent)] backdrop-blur-xl"
        >
          <h2 className="glow-cyan text-accent text-sm font-semibold tracking-[0.14em]">INSERT COIN</h2>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">E-mail</span>
            <input
              type="email"
              name="email"
              id="email"
              required
              autoComplete="username email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-surface-2/70 text-foreground border-accent/30 placeholder:text-muted-foreground/60 focus:border-accent/70 rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Senha</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="current-password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-surface-2/70 text-foreground border-accent/30 placeholder:text-muted-foreground/60 focus:border-accent/70 w-full rounded-lg border px-3 py-2.5 pr-11 text-sm outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                aria-pressed={showPassword}
                className="text-muted-foreground hover:text-accent absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.4} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.4} />
                )}
              </button>
            </div>
          </label>
          <Link
            to="/forgot-password"
            className="text-muted-foreground hover:text-accent self-end text-xs no-underline transition-colors"
          >
            Esqueci a senha
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground mt-1 rounded-full px-3 py-3.5 text-sm font-bold tracking-[0.18em] shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neon-magenta)_75%,transparent)] transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "CARREGANDO..." : "ENTRAR"}
          </button>

          <p className="text-muted-foreground text-center text-xs">
            Sem conta?{" "}
            <Link to="/register" className="text-accent font-medium no-underline hover:underline hover:decoration-1">
              Criar player
            </Link>
          </p>
        </form>
      </div>
    </ArcadeShell>
  );
}
