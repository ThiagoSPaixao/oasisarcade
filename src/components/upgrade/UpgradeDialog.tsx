import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlanCards } from "./PlanCards";
import type { PlanStatus } from "@/types/arcade";

export function UpgradeDialog({
  open,
  onOpenChange,
  current,
  onSelect,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: PlanStatus;
  onSelect: (plan: PlanStatus) => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="ui-label glow-magenta text-primary text-sm">
            JOGO PREMIUM — FAÇA UPGRADE
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-xs">
          Esse fliperama é só para o Player 2. Assine para liberar todos os jogos premium.
        </p>
        <PlanCards current={current} onSelect={onSelect} pending={pending ?? false} />
      </DialogContent>
    </Dialog>
  );
}
