import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — Oásis Arcade" },
      { name: "description", content: "Defina uma nova senha para sua conta do Oásis Arcade e volte a jogar." },
      { property: "og:title", content: "Nova senha — Oásis Arcade" },
      { property: "og:description", content: "Crie uma nova senha e retome seus recordes no Oásis Arcade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada! Bora jogar.");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a senha");
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
          <h2 className="glow-cyan text-accent text-sm font-semibold tracking-[0.14em]">NOVA SENHA</h2>
          {!ready ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              Abra esta página pelo link enviado no seu e-mail para redefinir a senha.
            </p>
          ) : null}
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Senha</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                name="new-password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-surface-2/70 text-foreground border-accent/30 placeholder:text-muted-foreground/60 focus:border-accent/70 w-full rounded-lg border px-3 py-2.5 pr-11 text-sm outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Ocultar senha" : "Exibir senha"}
                className="text-muted-foreground hover:text-accent absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md transition-colors"
              >
                {show ? <EyeOff className="h-4 w-4" strokeWidth={1.4} /> : <Eye className="h-4 w-4" strokeWidth={1.4} />}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={loading || !ready}
            className="bg-primary text-primary-foreground mt-1 rounded-full px-3 py-3.5 text-sm font-bold tracking-[0.18em] shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neon-magenta)_75%,transparent)] transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "SALVANDO..." : "SALVAR SENHA"}
          </button>
        </form>
      </div>
    </ArcadeShell>
  );
}
