import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { useSoundStore } from "@/stores/sound-store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Oásis Arcade — fliperama de jogos clássicos 8-bits" },
      {
        name: "description",
        content:
          "Oásis Arcade por ThiagoS.Paixão: Tetris, Snake, Jogo da Memória, Space Shooter e mais clássicos 8-bits com sons retrô direto no navegador.",
      },
      { property: "og:title", content: "Oásis Arcade — clássicos 8-bits no navegador" },
      {
        property: "og:description",
        content: "Entre no fliperama neon e jogue Tetris, Snake, Memória e Space Shooter com sons 8-bit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const HIGHLIGHTS = ["TETRIS", "SNAKE", "MEMÓRIA", "SPACE SHOOTER", "PONG", "BREAKOUT"];

function LandingPage() {
  const navigate = useNavigate();
  const unlock = useSoundStore((s) => s.unlock);
  const play = useSoundStore((s) => s.play);
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
      setChecking(false);
    });
  }, []);

  const enter = () => {
    unlock();
    play("coin");
    setTimeout(() => navigate({ to: loggedIn ? "/dashboard" : "/login" }), 260);
  };

  return (
    <ArcadeShell className="grid min-h-screen place-items-center px-5 py-10">
      <main className="relative mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--neon-magenta) 40%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 -right-10 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--neon-cyan) 40%, transparent), transparent 70%)",
          }}
        />

        <div className="relative mb-6">
          <span className="border-accent/25 absolute inset-0 -m-3 animate-ping rounded-full border opacity-60" />
          <div className="border-accent/40 bg-surface/40 relative grid h-20 w-20 place-items-center rounded-full border shadow-[0_0_36px_-12px_color-mix(in_oklab,var(--neon-cyan)_60%,transparent)] backdrop-blur">
            <Gamepad2 className="text-accent h-9 w-9" strokeWidth={1.1} />
          </div>
        </div>

        <p className="ui-label text-neon-yellow glow-yellow animate-pulse text-[11px] tracking-widest">
          INSIRA UMA FICHA
        </p>

        <h1 className="font-pixel glow-magenta text-primary mt-4 text-[24px] leading-tight font-normal sm:text-4xl">
          OÁSIS
          <br />
          <span className="glow-cyan text-accent">ARCADE</span>
        </h1>

        <p className="text-muted-foreground mt-5 max-w-xs text-sm leading-relaxed">
          Os clássicos de fliperama que você jogava — agora no seu bolso, com som 8-bit de verdade.
        </p>

        <div className="mt-6 w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <ul className="flex w-max gap-2 [animation:arcade-marquee_22s_linear_infinite]">
            {[...HIGHLIGHTS, ...HIGHLIGHTS].map((game, index) => (
              <li
                key={`${game}-${index}`}
                className="border-accent/35 bg-surface/40 text-foreground/80 shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-medium tracking-wide whitespace-nowrap backdrop-blur"
              >
                {game}
              </li>
            ))}
          </ul>
        </div>


        <button
          type="button"
          onClick={enter}
          disabled={checking}
          className="bg-primary text-primary-foreground mt-9 w-full rounded-full px-6 py-4 text-sm font-bold tracking-[0.18em] shadow-[0_0_40px_-10px_color-mix(in_oklab,var(--neon-magenta)_75%,transparent)] transition-transform active:scale-95 disabled:opacity-60 sm:w-auto sm:px-14"
        >
          ENTRAR
        </button>

        {!loggedIn && !checking ? (
          <p className="text-muted-foreground mt-6 text-xs">
            Novo por aqui?{" "}
            <Link to="/register" className="text-accent underline">
              crie sua conta
            </Link>
          </p>
        ) : null}

        <footer className="ui-label text-muted-foreground mt-10 text-[10px] leading-relaxed">
          DESENVOLVIDO POR
          <br />
          <span className="text-neon-green glow-yellow mt-1 inline-block text-[10px]">ThiagoS.Paixão</span>
        </footer>
      </main>
    </ArcadeShell>
  );
}
