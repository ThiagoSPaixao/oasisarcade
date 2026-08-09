# Acelerar a abertura das cartas no Jogo da Memória

## O problema

Hoje a imagem da carta só é criada no DOM no momento em que a carta é virada, e com `loading="lazy"`. Ou seja: a cada primeiro toque, o navegador precisa buscar e decodificar a imagem naquele instante — daí a sensação de lentidão/atraso ao abrir a carta.

## O que muda

1. **Pré-carregar as imagens** ao montar o tabuleiro (e ao trocar de dificuldade), antes de qualquer toque. Assim, quando a carta vira, a imagem já está pronta em cache.
2. **Manter a imagem sempre no DOM**, apenas escondida no verso da carta, em vez de criá-la no momento do clique — a virada passa a ser instantânea.
3. **Remover `loading="lazy"`** das faces das cartas (as cartas estão na tela, o lazy só atrasa) e usar decodificação antecipada.
4. Pequeno ajuste de responsividade do toque: feedback visual imediato no clique, sem esperar a imagem.

Nada muda nas regras do jogo: pares, dificuldades, pontuação, sons e layout continuam iguais.

## Detalhes técnicos

- `src/lib/memory-cards.ts`: adicionar `preloadMemoryIcons(icons)` que cria `new Image()` por URL e usa `img.decode()` quando disponível, com cache de URLs já carregadas (evita repetir entre partidas).
- `src/components/games/MemoryGame.tsx`:
  - chamar o preload dentro dos efeitos que já constroem o deck (montagem e mudança de dificuldade);
  - renderizar sempre o `<img>` da face, controlando visibilidade por classe (`opacity`/`invisible`) em vez de montagem condicional; o `?` do verso continua sobreposto quando fechada;
  - trocar `loading="lazy"` por `fetchpriority="high"` + `decoding="sync"` nas faces;
  - manter `aria-label` atual para acessibilidade.
- Sem mudanças em assets, banco de dados ou lógica de pontuação.
