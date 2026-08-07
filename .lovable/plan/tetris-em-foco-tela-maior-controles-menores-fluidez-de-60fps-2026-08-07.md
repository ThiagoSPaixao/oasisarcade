# Tetris em foco: tela maior, controles menores, fluidez de 60fps

Reorganizar a tela do Tetris para o jogo ocupar o máximo possível do aparelho, como nos consoles clássicos, com o painel de próximas peças na lateral e um render loop mais fluido.

## Layout

- Tabuleiro passa a ser o elemento dominante: altura calculada a partir do espaço realmente livre (`100dvh` menos header e controles), sem limite fixo de 340px de largura.
- Coluna lateral direita compacta com: rótulo PRÓXIMAS + as 3 miniaturas empilhadas verticalmente, e abaixo LINHAS/NÍVEL. Nada mais acima do tabuleiro.
- Remove a linha superior de preview e a barra inferior atual (o botão "DESCER ↓↓" vira um botão pequeno dentro da coluna lateral, mantendo a função de hard drop).
- Controles (D-Pad / analógico + A/B) ficam mais baixos e enxutos nesta tela: botões e espaçamentos menores, dica de teclas em uma única linha discreta.

## Fluidez (FPS)

- Loop com passo lógico fixo por acumulador de tempo, igual ao que já deu resultado no Snake: a queda da peça não depende da taxa de quadros.
- Desenho apenas quando o estado muda de fato, com a grade pré-renderizada em uma camada de canvas separada em vez de redesenhada linha por linha a cada frame.
- Cores do tema lidas uma vez e cacheadas (fim do `getComputedStyle` por bloco/frame), com recálculo ao trocar tema.
- Resolução do canvas com DPR limitado em telas de alta densidade, para reduzir a carga de pintura no mobile.
- Repetição suave ao segurar esquerda/direita/baixo, com bloqueio de repetição indesejada.

## Detalhes técnicos

- `src/components/games/TetrisGame.tsx`: novo grid `[minmax(0,1fr)_auto]` (lateral) responsivo, refatoração do loop para acumulador + `dirty flag`, camada de grade em canvas offscreen, cache de variáveis CSS, DPR adaptativo, auto-repeat de input.
- `src/components/games/GamePlayer.tsx`: variante compacta de controles quando o jogo é o Tetris (props/classe de densidade), mantendo os outros jogos inalterados.
- `src/components/games/DPad.tsx` e `AnalogPad.tsx`: aceitar um modo compacto (tamanhos reduzidos) sem alterar o comportamento de entrada.
- `src/styles.css`: ajuste das variáveis de `.game-fit` para permitir tabuleiro alto/vertical dominante no Tetris.
- Nenhuma mudança de banco de dados, pontuação ou API.
