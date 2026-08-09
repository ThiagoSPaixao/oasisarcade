# Corrigir seleção de texto ao usar o controle

Ao arrastar o analógico (ou segurar os botões do D-Pad), o navegador interpreta o toque longo como seleção de texto e destaca o componente. A correção é desabilitar seleção/callout de toque na área de jogo e nos controles.

## O que muda

- Bloquear seleção de texto e menu de toque longo em toda a tela de jogo enquanto ela está ativa.
- Analógico, D-Pad e botões A/B passam a ignorar seleção, arraste e destaque azul de toque.
- Garantir que o gesto de arraste no analógico não role a página nem inicie seleção.
- Nenhuma mudança de lógica de jogo, entrada de comandos ou visual.

## Detalhes técnicos

- `src/styles.css`: em `html.game-locked`, adicionar `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none` e `-webkit-tap-highlight-color: transparent`.
- `src/components/games/AnalogPad.tsx`: adicionar `select-none touch-none` no contêiner e nos botões, `draggable={false}`, e `preventDefault` também no `pointermove` da base.
- `src/components/games/DPad.tsx`: `select-none touch-none` nos botões direcionais e A/B.
