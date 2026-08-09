import type { Game, GameCategory } from "@/types/arcade";
import { GAME_REGISTRY, getDefinition, resolveSlug } from "./game-registry";
import type { CatalogGame, GameSlug } from "./game-types";

export { GAME_REGISTRY, resolveSlug, getDefinition };
export type { CatalogGame, GameSlug };

/**
 * Junta os metadados administráveis (banco) com a definição técnica (registro).
 * Jogos sem definição técnica são ignorados; jogos marcados como "soon" no
 * banco (ou sem componente) ficam com status "coming_soon".
 */
export function toCatalogGame(row: Game): CatalogGame | null {
  const definition = getDefinition(row.slug);
  if (!definition) return null;
  const available = row.state === "playable" && definition.component !== null;
  return {
    ...row,
    slug: definition.slug,
    cover: definition.cover ?? row.thumbnail ?? null,
    status: available ? "available" : "coming_soon",
    definition,
  };
}

export function mergeCatalog(rows: Game[]): CatalogGame[] {
  return rows
    .map(toCatalogGame)
    .filter((game): game is CatalogGame => game !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getGameBySlug(games: CatalogGame[], raw: string): CatalogGame | null {
  const slug = resolveSlug(raw);
  return games.find((game) => game.slug === slug) ?? null;
}

export function getAvailableGames(games: CatalogGame[]): CatalogGame[] {
  return games.filter((game) => game.status === "available");
}

export function getGamesByCategory(games: CatalogGame[], category: GameCategory): CatalogGame[] {
  return games.filter((game) => game.category === category);
}

export function getRankedGames(games: CatalogGame[]): CatalogGame[] {
  return games.filter((game) => game.definition.supportsRanking);
}
