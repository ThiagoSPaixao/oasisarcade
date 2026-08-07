# Redesign visual: Cyberpunk / Neon Moderno

Troca a estética "fliperama pixelado" por um visual cyberpunk moderno: tipografia limpa, cantos suaves, bordas finas, neon difuso e painéis de vidro. Nenhuma mudança de funcionalidade, rotas, jogos ou banco de dados.

## O que muda

**Tipografia**
- Inter (geométrica, limpa) para 95% da interface: textos, labels, botões, badges, HUDs.
- A fonte pixelada (Press Start 2P) fica reservada ao logotipo "RETRÔ ARCADE" e aos títulos H1 principais (splash, GAME OVER), em tamanho contido.
- Botões e textos pequenos que hoje usam pixel passam para Inter com peso médio e leve espaçamento de letras.

**Bordas e cantos**
- Todos os contornos vão de 2px para 1px.
- Raio: 16px em cards, painéis e contêineres grandes; 8px em botões, inputs e badges.
- Os utilitários `pixel-border`, `pixel-border-cyan` e `pixel-border-magenta` são reescritos como bordas finas neon com halo suave (mantendo os nomes, para não tocar em toda a árvore de componentes).

**Cores**
- Fundo preto profundo levemente azulado; superfícies um pouco mais claras e translúcidas.
- Rosa neon e ciano neon mais saturados, mas com glow menor e mais difuso (menos "borrão", mais aura).
- Texto de leitura em cinza claro; amarelo e verde neon mantidos como acentos de pontuação.

**Efeitos**
- Novo utilitário de glassmorphism (fundo semitransparente + blur) aplicado ao header do dashboard, ao overlay de estado dos jogos, ao modal de upgrade e aos painéis sobrepostos.
- Scanlines e flicker de CRT ficam bem mais suaves (quase imperceptíveis) para não competir com o visual moderno; o grid de fundo fica mais discreto.

## Detalhes técnicos

- `src/styles.css`: novos valores de `--radius`, tokens neon refinados, glows reduzidos, reescrita dos utilitários `pixel-border*`, `glow-*`, `scanlines`, `crt-flicker`, `arcade-grid`, e adição de `@utility glass` (usa apenas `backdrop-filter`, sem prefixo `-webkit-`).
- `src/routes/__root.tsx`: ajuste do link do Google Fonts para carregar os pesos necessários de Inter (400/500/600/700) e manter Press Start 2P.
- Componentes ajustados apenas na camada de classes (`font-pixel` → tipografia Inter onde não é H1/logo, raios e `glass`): ArcadeShell, DashboardHeader, DailyBanner, GameCard, GameCarousel, GameRail, SoundToggle, DPad, GameOverlay, ComingSoon, GamePlayer, PlanCards, UpgradeDialog, rotas index/login/register/dashboard/game/upgrade.
- Canvas dos jogos (Tetris, Snake, Pong, Breakout, Shooter, Memória) permanece com pixel art; só molduras e HUD ao redor mudam.
- De passagem, corrigir o aviso de hidratação na tela de login (diferença SSR/cliente no wrapper do ArcadeShell).
