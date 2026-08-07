import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar senha — Oásis Arcade" },
      {
        name: "description",
        content: "Esqueceu a senha do Oásis Arcade? Receba um link seguro por e-mail e volte ao fliperama.",
      },
      { property: "og:title", content: "Recuperar senha — Oásis Arcade" },
      { property: "og:description", content: "Enviamos um link de redefinição de senha para o seu e-mail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Link de redefinição enviado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail");
    } finally {
      setLoading(false);
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
          <h2 className="glow-cyan text-accent text-sm font-semibold tracking-[0.14em]">CONTINUE?</h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {sent
              ? "Enviamos um link para o seu e-mail. Se não aparecer na caixa de entrada, confira o spam e marque como “não é spam”."
              : "Informe seu e-mail e enviaremos um link seguro para criar uma nova senha."}
          </p>
          {!sent ? (
            <>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">E-mail</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-surface-2/70 text-foreground border-accent/30 placeholder:text-muted-foreground/60 focus:border-accent/70 rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground mt-1 rounded-full px-3 py-3.5 text-sm font-bold tracking-[0.18em] shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neon-magenta)_75%,transparent)] transition-transform active:scale-95 disabled:opacity-60"
              >
                {loading ? "ENVIANDO..." : "ENVIAR LINK"}
              </button>
            </>
          ) : null}
          <p className="text-muted-foreground text-center text-xs">
            <Link to="/login" className="text-accent font-medium no-underline hover:underline hover:decoration-1">
              Voltar para o login
            </Link>
          </p>
        </form>
      </div>
    </ArcadeShell>
  );
}
