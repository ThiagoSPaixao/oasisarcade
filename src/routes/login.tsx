import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Retrô Arcade" },
      { name: "description", content: "Entre na sua conta do Retrô Arcade e continue jogando os clássicos." },
      { property: "og:title", content: "Entrar — Retrô Arcade" },
      { property: "og:description", content: "Acesse sua conta do Retrô Arcade e volte para o fliperama." },
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
        <p className="font-pixel glow-magenta text-primary neon-pulse mb-8 text-center text-base">
          RETRÔ ARCADE
        </p>
        <form onSubmit={onSubmit} className="bg-surface/70 panel flex flex-col gap-4 p-5 backdrop-blur">
          <h1 className="ui-label glow-cyan text-accent text-sm">INSERT COIN</h1>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-background text-foreground pixel-border-cyan px-3 py-2 text-sm outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Senha</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-background text-foreground pixel-border-cyan px-3 py-2 text-sm outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="ui-label bg-primary text-primary-foreground rounded-lg px-3 py-3.5 text-xs transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "CARREGANDO..." : "ENTRAR"}
          </button>
          <p className="text-muted-foreground text-center text-xs">
            Sem conta?{" "}
            <Link to="/register" className="text-accent underline">
              Criar player
            </Link>
          </p>
        </form>
      </div>
    </ArcadeShell>
  );
}
