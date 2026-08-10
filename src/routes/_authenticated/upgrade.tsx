import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Rota antiga de "upgrade": a página informativa do plano agora é /premium.
 * Mantida como redirecionamento para não quebrar links salvos.
 */
export const Route = createFileRoute("/_authenticated/upgrade")({
  beforeLoad: () => {
    throw redirect({ to: "/premium", replace: true });
  },
});
