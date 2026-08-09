/**
 * Curva de níveis — espelho exato de public.xp_for_level / public.level_for_xp.
 * O servidor é a autoridade: aqui só calculamos o que a UI precisa exibir.
 */
export const MAX_LEVEL = 100;

/** XP acumulado necessário para alcançar o nível informado. */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  if (n <= 1) return 0;
  return 100 * (n - 1) + 25 * (n - 1) * (n - 2);
}

export function levelForXp(xp: number): number {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= safeXp) level += 1;
  return level;
}

export type LevelProgress = {
  level: number;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpInLevel: number;
  xpNeeded: number;
  xpRemaining: number;
  percent: number;
  isMax: boolean;
};

/** Progresso do nível atual: base para a barra de XP do dashboard. */
export function levelProgress(xp: number, level?: number): LevelProgress {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const current = level && level > 0 ? Math.min(MAX_LEVEL, Math.floor(level)) : levelForXp(safeXp);
  const levelStartXp = xpForLevel(current);
  const isMax = current >= MAX_LEVEL;
  const nextLevelXp = isMax ? levelStartXp : xpForLevel(current + 1);
  const xpNeeded = Math.max(1, nextLevelXp - levelStartXp);
  const xpInLevel = Math.max(0, Math.min(xpNeeded, safeXp - levelStartXp));
  return {
    isMax,
    level: current,
    xp: safeXp,
    levelStartXp,
    nextLevelXp,
    xpInLevel,
    xpNeeded,
    xpRemaining: isMax ? 0 : Math.max(0, xpNeeded - xpInLevel),
    percent: isMax ? 100 : Math.round((xpInLevel / xpNeeded) * 100),
  };
}
