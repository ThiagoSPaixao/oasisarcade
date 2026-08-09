import { Lock } from "lucide-react";
import { RushDevCard } from "./RushDevCard";

export function ComingSoon({ name }: { name: string }) {
  return (
    <div className="w-full max-w-[520px]">
      <div className="bg-surface panel flex aspect-square w-full flex-col items-center justify-center gap-4 p-6 text-center opacity-90 grayscale">
        <span className="border-foreground/15 text-muted-foreground grid h-16 w-16 place-items-center rounded-full border">
          <Lock className="h-7 w-7" strokeWidth={1.4} />
        </span>
        <p className="text-muted-foreground max-w-xs text-sm">Este Clássico está em desenvolvimento</p>
      </div>
      <RushDevCard gameName={name} />
    </div>
  );
}
