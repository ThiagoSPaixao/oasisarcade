import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/login" });
  },
  head: () => ({
    meta: [
      { title: "Retrô Arcade — fliperama de jogos clássicos no navegador" },
      {
        name: "description",
        content:
          "Retrô Arcade: jogue clássicos 8-bits como Snake direto do navegador, suba de nível e desbloqueie jogos premium.",
      },
      { property: "og:title", content: "Retrô Arcade — fliperama de jogos clássicos" },
      {
        property: "og:description",
        content: "Entre no fliperama neon, jogue Snake e outros clássicos 8-bits e bata seus recordes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
