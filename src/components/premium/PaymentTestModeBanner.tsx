const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/**
 * Aviso de ambiente de pagamento. Não renderiza nada em produção configurada.
 */
export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="border-primary/40 bg-primary/10 text-primary rounded-2xl border px-4 py-2.5 text-center text-[11px] font-semibold">
        O checkout de produção ainda não está configurado. Conclua a ativação de pagamentos ao vivo
        para receber pagamentos reais.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow rounded-2xl border px-4 py-2.5 text-center text-[11px] font-semibold">
        Ambiente de teste: nenhum pagamento real é cobrado nesta pré-visualização.
      </div>
    );
  }
  return null;
}
