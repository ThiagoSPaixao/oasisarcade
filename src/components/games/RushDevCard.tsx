import { Mail, Send } from "lucide-react";
import { useSoundStore } from "@/stores/sound-store";

const DEV_EMAIL = "thiagospaixao.dev@gmail.com";

/** Card com botão para o player pedir prioridade no desenvolvimento do clássico. */
export function RushDevCard({ gameName }: { gameName: string }) {
  const play = useSoundStore((s) => s.play);

  const sendMessage = () => {
    play("select");
    const subject = encodeURIComponent(`Oásis Arcade · Apressem o ${gameName}!`);
    const body = encodeURIComponent(
      `Olá, Thiago!\n\nEstou jogando no Oásis Arcade e quero muito jogar ${gameName}.\nDá para apressar o desenvolvimento desse clássico?\n\nValeu!`,
    );
    window.location.href = `mailto:${DEV_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="glass border-accent/25 mt-4 rounded-2xl border p-4 text-center">
      <p className="text-foreground text-sm font-semibold tracking-tight">
        Quer jogar {gameName} logo?
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-snug">
        Envie uma mensagem para apressar o desenvolvedor.
      </p>
      <button
        type="button"
        onClick={sendMessage}
        className="bg-accent text-background mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-bold tracking-[0.14em] shadow-[0_0_30px_-10px_var(--neon-cyan)] transition-transform active:scale-95"
      >
        <Send className="h-4 w-4" strokeWidth={1.6} /> APRESSAR DESENVOLVEDOR
      </button>
      <p className="text-muted-foreground/70 mt-2 inline-flex items-center gap-1.5 text-[10px]">
        <Mail className="h-3 w-3" strokeWidth={1.4} /> {DEV_EMAIL}
      </p>
    </div>
  );
}
