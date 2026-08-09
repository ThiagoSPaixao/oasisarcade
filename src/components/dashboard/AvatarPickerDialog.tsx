import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AVATAR_OPTIONS } from "@/lib/avatars";

export function AvatarPickerDialog({
  open,
  onOpenChange,
  current,
  onSelect,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string | null;
  onSelect: (url: string) => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="glow-magenta text-primary text-sm font-semibold tracking-wide">
            Escolha seu Avatar Cyberpunk 👑
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-xs">
          Toque em um avatar para usá-lo no seu perfil.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {AVATAR_OPTIONS.map((avatar) => {
            const selected = current === avatar.url;
            return (
              <button
                key={avatar.id}
                type="button"
                disabled={pending}
                onClick={() => onSelect(avatar.url)}
                aria-label={avatar.label}
                aria-pressed={selected}
                className={`relative aspect-square overflow-hidden rounded-xl border transition-all disabled:opacity-60 ${
                  selected
                    ? "border-primary shadow-[0_0_18px_-4px_var(--neon-magenta)]"
                    : "border-foreground/15 hover:border-accent/70 hover:shadow-[0_0_16px_-6px_var(--neon-cyan)]"
                }`}
              >
                <img
                  src={avatar.url}
                  alt={avatar.label}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {selected ? (
                  <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full">
                    <Check className="h-3 w-3" strokeWidth={2.4} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
