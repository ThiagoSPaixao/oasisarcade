import { Construction } from "lucide-react";

export function ComingSoon({ name }: { name: string }) {
  return (
    <div className="bg-surface pixel-border flex aspect-square w-full max-w-[520px] flex-col items-center justify-center gap-4 p-6 text-center">
      <Construction className="text-neon-yellow h-12 w-12" />
      <p className="font-pixel glow-yellow text-neon-yellow text-sm">Em breve!</p>
      <p className="text-muted-foreground max-w-xs text-sm">
        {name} está sendo montado no fliperama. Volte logo para inserir sua fichinha.
      </p>
    </div>
  );
}
