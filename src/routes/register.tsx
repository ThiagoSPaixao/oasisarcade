import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar conta — Retrô Arcade" },
      {
        name: "description",
        content: "Crie sua conta grátis no Retrô Arcade e comece a jogar clássicos 8-bits agora.",
      },
      { property: "og:title", content: "Criar conta — Retrô Arcade" },
      {
        property: "og:description",
        content: "Cadastro rápido no Retrô Arcade: jogue Snake e outros clássicos e acumule XP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    try {
      await signUp(email.trim(), password, username.trim());
      toast.success("Player criado! Bora jogar.");
      navigate({ to: "/dashboard" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar conta";
      toast.error(
        message.toLowerCase().includes("already") ? "Esse e-mail já tem um player." : message,
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
          <h1 className="ui-label glow-cyan text-accent text-xs">NEW PLAYER</h1>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Nome de player</span>
            <input
              required
              maxLength={20}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="bg-background text-foreground pixel-border-cyan px-3 py-2 text-sm outline-none"
            />
          </label>
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
              autoComplete="new-password"
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
            {loading ? "CRIANDO..." : "CRIAR CONTA"}
          </button>
          <p className="text-muted-foreground text-center text-xs">
            Já tem conta?{" "}
            <Link to="/login" className="text-accent underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </ArcadeShell>
  );
}
