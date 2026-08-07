import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gamepad2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArcadeShell } from "@/components/arcade/ArcadeShell";
import { SoundToggle } from "@/components/arcade/SoundToggle";
import { useSoundStore } from "@/stores/sound-store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Retrô Arcade — fliperama de jogos clássicos 8-bits" },
      {
        name: "description",
        content:
          "Retrô Arcade por ThiagoS.Paixão: Tetris, Snake, Jogo da Memória, Space Shooter e mais clássicos 8-bits com sons retrô direto no navegador.",
      },
      { property: "og:title", content: "Retrô Arcade — clássicos 8-bits no navegador" },
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
      <main className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="panel-cyan bg-surface/60 mb-6 grid h-20 w-20 place-items-center backdrop-blur">
          <Gamepad2 className="text-accent h-10 w-10" />
        </div>

        <p className="ui-label text-neon-yellow glow-yellow animate-pulse text-[11px] tracking-widest">
          INSIRA UMA FICHA
        </p>

        <h1 className="font-pixel glow-magenta text-primary mt-4 text-[26px] leading-tight sm:text-4xl">
          RETRÔ
          <br />
          <span className="glow-cyan text-accent">ARCADE</span>
        </h1>

        <p className="text-muted-foreground mt-5 text-sm">
          Os clássicos de fliperama que você jogava — agora no seu bolso, com som 8-bit de verdade.
        </p>

        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {HIGHLIGHTS.map((game) => (
            <li
              key={game}
              className="ui-label bg-surface/60 pixel-border text-foreground/80 rounded-lg px-2.5 py-1.5 text-[10px] backdrop-blur"
            >
              {game}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={enter}
          disabled={checking}
          className="ui-label bg-primary text-primary-foreground mt-9 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm transition-transform active:scale-95 disabled:opacity-60 sm:w-auto sm:px-12"
        >
          <Play className="h-4 w-4" />
          ENTRAR
        </button>

        <div className="mt-6 flex flex-col items-center gap-3">
          <SoundToggle />
          <p className="text-muted-foreground text-[10px]">Som e trilha 8-bit: ligue ou desligue quando quiser</p>
        </div>

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
