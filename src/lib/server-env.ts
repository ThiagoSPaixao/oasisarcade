// Ponte de ambiente do servidor.
//
// Na hospedagem nativa (Lovable Cloud) as variáveis de servidor
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY são injetadas automaticamente.
// Em hospedagens externas (ex.: Vercel) é comum que apenas as variáveis
// públicas VITE_SUPABASE_* estejam cadastradas — nesse caso todas as
// funções de servidor autenticadas (ranking, desafio do dia, XP, plano)
// falham com "Missing Supabase environment variable(s)".
//
// Aqui apenas espelhamos os valores PÚBLICOS (URL + publishable key), que já
// são embutidos no bundle do cliente por definição. Nenhum segredo é lido,
// espelhado ou registrado: a service role key nunca passa por este arquivo.
const PUBLIC_FALLBACKS: Array<[string, string | undefined]> = [
  ["SUPABASE_URL", import.meta.env["VITE_SUPABASE_URL"]],
  ["SUPABASE_PUBLISHABLE_KEY", import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]],
  ["SUPABASE_PROJECT_ID", import.meta.env["VITE_SUPABASE_PROJECT_ID"]],
];

export function hydrateServerEnvFromPublicVars(): void {
  if (typeof process === "undefined" || !process.env) return;
  for (const [key, value] of PUBLIC_FALLBACKS) {
    if (!process.env[key] && value) process.env[key] = value;
  }
}

hydrateServerEnvFromPublicVars();
