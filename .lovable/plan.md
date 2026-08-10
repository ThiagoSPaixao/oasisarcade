# Controle do Tetris: setas como padrão

Hoje o Tetris usa um analógico central (toque no centro = descer rápido) e um botão "A" para girar. O ajuste troca isso por um controle de setas com botões ilustrados.

## O que muda

- O Tetris passa a usar **setas direcionais** (esquerda, direita, baixo) como controle padrão.
- Botão **GIRAR**: ícone de seta circular dentro do botão, gira a peça.
- Botão **DESCER RÁPIDO**: ícone de setas duplas apontando para baixo, faz o hard drop.
- Botões mantêm o estilo neon atual (girar em rosa, descer em ciano), com rótulo acessível.
- Quem escolher "analógico" nas configurações gerais continua com o analógico, mas agora com os mesmos dois botões (girar / descer rápido) ao lado, em vez do toque central.
- A seta para cima não faz nada no Tetris (mantido como hoje).
- Dica de texto abaixo do controle atualizada para "Setas movem · GIRAR gira a peça · ▼▼ desce rápido".

## Detalhes técnicos

- `src/components/games/TetrisPad.tsx`: aceitar `mode: "dpad" | "analog"`. No modo dpad, renderizar cruz direcional (esquerda/direita/baixo, com "cima" desativada visualmente) reaproveitando o estilo dos botões do `DPad`; no modo analog, manter a base analógica sem a ação de toque central. Em ambos, renderizar os dois botões: `RotateCw` (dispara `pressAction("a")`) e `ChevronsDown` (dispara `pressAction("b")`), ambos com `aria-label`.
- `src/components/games/GamePlayer.tsx`: passar `mode={controlMode}` para `<TetrisPad />`.
- Sem alteração na lógica do jogo (`TetrisGame.tsx` já mapeia A = girar, B = hard drop) nem no store de configurações.
