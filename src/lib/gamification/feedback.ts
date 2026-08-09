import { toast } from "sonner";
import type { GameResultOutcome } from "./types";

/**
 * Feedback visual da progressão: usa o toast neon já existente no app,
 * sem animações pesadas e sem bloquear o fluxo do jogo.
 */
export function celebrateOutcome(outcome: GameResultOutcome): void {
  if (outcome.challengeCompleted) {
    toast.success("🎯 DESAFIO DIÁRIO CONCLUÍDO!", {
      description: `+${outcome.challengeXp} XP · sequência de ${outcome.currentStreak} dia(s)`,
    });
  }

  for (const achievement of outcome.unlocked) {
    toast.success("🏆 CONQUISTA DESBLOQUEADA!", {
      description: `${achievement.name} · +${achievement.xpReward} XP`,
    });
  }

  if (outcome.levelUp) {
    toast.success("🎉 LEVEL UP!", {
      description: `Você alcançou o nível ${outcome.level}.`,
    });
  }
}
