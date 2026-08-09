# Sprint 02 — Game Registry e arquitetura do catálogo

Objetivo: centralizar tudo que hoje está espalhado sobre jogos (capas, componentes, controles, dificuldade, status) em um registro único e tipado, sem mexer em design, jogos, auth, RLS, XP ou ranking.

## Estado atual verificado

- O banco (`games`) já é a fonte dos metadados: `slug, name, description, category, is_premium, thumbnail, state, sort_order`. Linhas atuais: `tetris`, `snake`, `memoria`, `space-shooter` (soon), `breakout` (soon), `pong` (soon).
- Duplicações técnicas espalhadas hoje:
  - `src/lib/game-covers.ts` — mapa slug → capa.
  - `src/components/games/GamePlayer.tsx` — `switch` slug → componente (com aliases `nave`/`arkanoid`), mapa `HINTS`, e condicionais de controle (`slug !== "memoria"`, `slug === "tetris"`, `isSnake`).
  - `src/components/games/GameSettingsMenu.tsx` — condicionais por slug para quais opções mostrar.
  - `src/lib/sound.ts` — trata tema de música por slug.
- Slugs não serão alterados (o slug do jogo da memória permanece `memoria`, pois é usado em `user_scores`, `favorites` e ranking).

## Nova arquitetura

```text
Banco (games)            Código (registry)
name, description        component (lazy)
thumbnail, category      controls / pad
is_premium, state        cover local
sort_order               opções suportadas (wrap, ghost, dificuldade)
                         supportsRanking / supportsXp / hint
        \                   /
         -> catalog (merge) -> cards, carrossel, /game/$slug, ranking
```

### Arquivos novos

- `src/lib/games/game-types.ts` — tipos: `GameSlug` (union dos 6 slugs), `GameCategory`, `GameDifficulty` (reaproveita `easy|normal|hard`), `GameStatus` (`available | coming_soon`), `GameControls` (`none | dpad | analog | tetris`), `GameCapabilities` e `GameDefinition` (parte técnica) + `CatalogGame` (definição técnica + metadados do banco).
- `src/lib/games/game-registry.ts` — registro único por slug com: componente via `React.lazy` (code splitting: nenhuma implementação de jogo entra no bundle inicial), capa local, controles, hint de controle, opções suportadas, `supportsRanking`, `supportsXp`, tema de música, aliases legados (`nave` → `space-shooter`, `arkanoid` → `breakout`).
- `src/lib/games/catalog.ts` — API simples: `resolveSlug()`, `getGameBySlug()`, `getAvailableGames()`, `getGamesByCategory()`, `mergeCatalog(rows)`. O status final é `coming_soon` se o banco disser `soon` ou se o registry não tiver componente.

### Arquivos modificados

- `src/lib/arcade-api.ts` — `fetchGames`/`fetchGame` passam pelo merge do catálogo (mesmo formato de dados para os componentes, sem quebrar chamadas atuais).
- `src/components/games/GamePlayer.tsx` — remove o `switch` e o mapa `HINTS`; passa a ler componente, controles e hint do registry, renderizando o jogo dentro de `<Suspense>` com um fallback discreto no mesmo estilo atual.
- `src/components/games/GameSettingsMenu.tsx` — mostra opções conforme `supportedOptions` do registry, em vez de comparar slugs.
- `src/components/dashboard/GameCard.tsx` e `GameCarousel.tsx` — consomem capa/status/premium do objeto do catálogo (visual idêntico ao atual).
- `src/routes/_authenticated/game.$slug.tsx` — valida o slug pelo catálogo, resolve aliases, mostra "Em breve" quando `coming_soon` e uma mensagem de jogo inexistente para slug fora do catálogo; mantém a lógica de premium/upgrade, score e XP como está.
- `src/routes/_authenticated/ranking.tsx` — lista apenas jogos com `supportsRanking`.
- `src/lib/game-covers.ts` — passa a reexportar do registry (ou é removido se não houver mais consumidores).

### Banco

Nenhuma migration é necessária: a tabela `games` já cobre todos os metadados administráveis, e nada de executável (nome de componente) vai para o banco.

## Preservado sem alterações

Auth, RLS, server functions da Sprint 01 (XP, score, ranking), Zustand, sons, mecânicas dos jogos, controles, favoritos, tema visual e layout.

## Verificação

- Typecheck + build de produção + lint.
- Navegação: `/game/tetris`, `/game/snake`, `/game/memoria`, e "Em breve" para `space-shooter`, `breakout`, `pong`; slug inválido tratado.
- Dashboard: ordem, nomes, capas, premium, favoritos (adicionar/remover/reload) e ranking funcionando.
- Conferência visual em mobile, tablet e desktop.
- Relatório final com arquivos criados/modificados/removidos, estrutura do registry, duplicações eliminadas, testes e riscos remanescentes.
