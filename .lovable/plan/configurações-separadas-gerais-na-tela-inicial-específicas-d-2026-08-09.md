# Configurações separadas: gerais na tela inicial, específicas dentro de cada jogo

## Objetivo

Tirar o menu de configurações gerais da tela de jogo e dar a cada jogo seu próprio menu de configurações, com dificuldade isolada e opções específicas.

## Configurações gerais (somente no Dashboard)

Continuam no menu atual: efeitos sonoros, trilha sonora, tema claro/escuro e modo de controle (setas/analógico). O botão de configurações sai do header da tela de jogo.

## Configurações dentro de cada jogo

Novo botão de engrenagem no header do jogo, abrindo um painel com as opções daquele jogo. Alterar a dificuldade reinicia a partida (aviso no painel). Tudo salvo por jogo, lembrado na próxima vez.

- **Snake**: dificuldade (Fácil / Médio / Difícil) e "Atravessar bordas" (liga/desliga) — com bordas desligadas a cobra reaparece do outro lado em vez de morrer.
- **Tetris**: dificuldade e "Sombra da peça (ghost)" (liga/desliga).
- **Space Shooter**: dificuldade (frequência/velocidade dos inimigos).
- **Breakout** e **Pong**: dificuldade (velocidade da bola / da raquete adversária).
- **Jogo da memória**: dificuldade (tamanho do tabuleiro: 4x3 / 4x4 / 5x4).

## Dificuldade e pontuação

Cada nível fica mais rápido/agressivo e vale mais pontos:

- Fácil: 1x
- Médio: 1.5x
- Difícil: 2x

O multiplicador é aplicado no ganho de pontos do jogo, então o placar final e o recorde/ranking já refletem a dificuldade escolhida. O nível ativo aparece no header do jogo (ex.: "DIFÍCIL · 2x") para o ranking ficar transparente.

## Detalhes técnicos

- `src/stores/settings-store.ts`: acrescenta um mapa `gameSettings` persistido por slug (`difficulty`, `snakeWrap`, `tetrisGhost`) com getters/setters e defaults; nada dos ajustes globais muda.
- Novo `src/components/games/GameSettingsMenu.tsx`: Sheet no mesmo estilo visual do menu atual, montando as linhas conforme o slug.
- `src/components/games/GamePlayer.tsx`: remove `SettingsMenu`, coloca `GameSettingsMenu` no header e mostra a etiqueta de dificuldade/multiplicador.
- Jogos (`SnakeGame`, `TetrisGame`, `ShooterGame`, `BreakoutGame`, `PongGame`, `MemoryGame`): leem as opções do store, derivam velocidade base/parâmetros e multiplicam o ganho de pontos; efeito de reinício quando a dificuldade muda. Snake ganha lógica de wrap opcional; Tetris passa a condicionar o desenho da ghost piece.
- Sem mudanças de banco de dados, API ou regras de gravação de recorde.
