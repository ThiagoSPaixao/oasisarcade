# Corrigir responsividade da tela inicial

O visual atual fica mantido como está. O problema é só de largura: a página escapa da tela do celular.

## O que está acontecendo

Medi a tela inicial em um viewport de 390px: o conteúdo da página tem 572px de largura, ou seja, sobra scroll horizontal e tudo aparece deslocado e maior do que deveria. A causa é a faixa deslizante de tags de jogos (TETRIS, SNAKE, MEMÓRIA...): a lista interna tem largura de conteúdo (1094px) e, por estar dentro de um container de grade sem limite mínimo, ela empurra a largura de todo o bloco central — arrastando o título, o texto e o botão ENTRAR junto.

## Correções

1. Limitar a largura do bloco central à largura real da tela, para que nenhum filho possa esticá-lo.
2. Fazer a faixa de tags recortar corretamente: o container passa a respeitar a largura da tela, e a lista deslizante roda dentro dele sem influenciar o layout.
3. Garantir que a página não tenha rolagem horizontal em nenhuma largura.
4. Ajuste fino de escala em telas pequenas (título, ícone, espaçamentos) para o conteúdo caber verticalmente sem cortar o crédito do rodapé.
5. Conferir em 320px, 390px e 430px de largura, além de tablet/desktop, que nada transborda e que o layout continua centralizado.

## Detalhes técnicos

- `src/routes/index.tsx`: adicionar `min-w-0`/`max-w-full` ao `<main>` e ao container da marquee, e trocar a estratégia do `w-max` na `<ul>` para não contribuir com a largura intrínseca do pai (container com `w-full overflow-hidden` + lista posicionada de forma que seu tamanho não propague).
- `src/components/arcade/ArcadeShell.tsx`: adicionar `w-full min-w-0 overflow-x-hidden` ao wrapper para conter transbordos de qualquer rota.
- Nenhuma mudança de cores, fontes, textos ou lógica.
- Validação com Playwright comparando `document.documentElement.scrollWidth` com `innerWidth` nas larguras citadas.
