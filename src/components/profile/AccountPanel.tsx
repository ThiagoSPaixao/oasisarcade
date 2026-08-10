import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Mail, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { deleteAccountSecure } from "@/lib/account.functions";
import { useAuthStore } from "@/stores/auth-store";

const inputClass =
  "border-foreground/15 bg-surface-2/50 text-foreground placeholder:text-muted-foreground/70 focus-visible:border-accent/60 focus-visible:ring-accent/40 mt-1.5 h-11 w-full rounded-lg border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";
const actionClass =
  "border-accent/40 text-accent hover:border-accent/70 focus-visible:ring-accent/60 mt-3 inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-[12px] font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60";

/** Segurança e conta: trocar senha, trocar e-mail e excluir a conta. */
export function AccountPanel({ email }: { email: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPending, setEmailPending] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A nova senha precisa de pelo menos 6 caracteres.");
      return;
    }
    setPasswordPending(true);
    try {
      // Reautenticação: garante que quem troca a senha sabe a senha atual.
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (authError) throw new Error("Senha atual incorreta.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Senha atualizada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar a senha.");
    } finally {
      setPasswordPending(false);
    }
  };

  const changeEmail = async () => {
    const value = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setEmailPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: value });
      if (error) throw new Error(error.message);
      setNewEmail("");
      toast.success("Enviamos um link de confirmação para o novo e-mail.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar o e-mail.");
    } finally {
      setEmailPending(false);
    }
  };

  const deleteAccount = async () => {
    setDeletePending(true);
    try {
      const result = await deleteAccountSecure({ data: { confirm: "EXCLUIR" } });
      if ("error" in result) throw new Error(result.error);
      await queryClient.cancelQueries();
      queryClient.clear();
      await signOut();
      toast.success("Conta excluída. Até a próxima!");
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <section className="glass mt-3 px-4 py-4 sm:px-5">
      <h2 className="ui-label text-accent text-[10px]">SEGURANÇA E CONTA</h2>

      <div className="border-foreground/10 mt-3 rounded-2xl border px-3.5 py-3.5">
        <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="text-accent h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Trocar senha
        </p>
        <label className="text-muted-foreground mt-2.5 block text-[11px]">
          Senha atual
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-muted-foreground mt-2.5 block text-[11px]">
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          disabled={passwordPending || !currentPassword || !newPassword}
          onClick={() => void changePassword()}
          className={actionClass}
        >
          {passwordPending ? "SALVANDO..." : "ATUALIZAR SENHA"}
        </button>
      </div>

      <div className="border-foreground/10 mt-3 rounded-2xl border px-3.5 py-3.5">
        <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Mail className="text-accent h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Trocar e-mail
        </p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          Atual: {email || "—"}. Você precisará confirmar o novo endereço pelo link enviado.
        </p>
        <label className="text-muted-foreground mt-2.5 block text-[11px]">
          Novo e-mail
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="button"
          disabled={emailPending || !newEmail}
          onClick={() => void changeEmail()}
          className={actionClass}
        >
          {emailPending ? "ENVIANDO..." : "ENVIAR CONFIRMAÇÃO"}
        </button>
      </div>

      <div className="border-primary/30 bg-primary/5 mt-3 rounded-2xl border px-3.5 py-3.5">
        <p className="text-primary flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Excluir conta
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
          Apaga seu perfil, progresso, recordes e conquistas, e cancela qualquer assinatura ativa. Esta ação
          não pode ser desfeita. Digite <span className="text-primary font-semibold">EXCLUIR</span> para
          confirmar.
        </p>
        <input
          type="text"
          value={confirmDelete}
          onChange={(e) => setConfirmDelete(e.target.value.toUpperCase())}
          placeholder="EXCLUIR"
          aria-label="Digite EXCLUIR para confirmar"
          className={inputClass}
        />
        <button
          type="button"
          disabled={deletePending || confirmDelete !== "EXCLUIR"}
          onClick={() => void deleteAccount()}
          className="border-primary/60 text-primary hover:border-primary focus-visible:ring-primary/60 mt-3 inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-[12px] font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          {deletePending ? "EXCLUINDO..." : "EXCLUIR MINHA CONTA"}
        </button>
      </div>
    </section>
  );
}
