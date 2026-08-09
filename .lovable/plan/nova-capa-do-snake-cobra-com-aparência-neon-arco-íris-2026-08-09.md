# Nova capa do Snake + cobra com aparência neon arco-íris

## Capa

Usar a imagem enviada (cobra neon arco-íris com cabeça robótica e fruta dourada) como capa oficial do Snake, substituindo a atual em todos os lugares: card do dashboard, carrossel "JOGO DO DIA" e favoritos. A imagem entra como asset hospedado e o mapeamento de capas passa a apontar para ela.

## Aparência da cobra no jogo

Sim, é possível chegar bem perto — não pixel a pixel como uma ilustração, mas com o mesmo caráter visual, desenhado em tempo real no canvas (isso mantém os 60fps que já conquistamos):

- **Corpo em arco-íris**: cada segmento recebe uma cor deslocada ao longo do corpo (magenta → azul → ciano → verde → amarelo → laranja/vermelho na cauda), como na imagem, com brilho neon difuso ao redor.
- **Segmentação em placas**: divisórias escuras entre segmentos e um brilho especular no topo de cada placa, dando o aspecto de armadura brilhante da referência.
- **Cabeça robótica**: cabeça mais angular, com visor/olho magenta luminoso, mandíbula que abre levemente ao comer e detalhe metálico na "gargantilha".
- **Fruta dourada**: a comida passa a ser um cristal facetado dourado com halo, no lugar da esfera rosa atual, alinhando com a imagem.
- **Fundo**: grade sutil e reflexo suave sob a cobra, mantendo o fundo escuro azulado atual.

Fica opcional: se quiser exatamente a ilustração como sprite (arte 2D pintada, não gerada por código), aí eu precisaria de sprites separados — cabeça, segmento reto, curva e cauda em PNG transparente. Nesse caso me envie esses 4 recortes e eu monto a cobra com eles.

## Detalhes técnicos

- `src/assets/cover-snake-neon.jpg.asset.json`: novo asset via CDN a partir da imagem enviada; import antigo `cover-snake.jpg` removido do mapa.
- `src/lib/game-covers.ts`: `snake` aponta para o novo asset.
- `src/components/games/SnakeGame.tsx`: paleta arco-íris por índice de segmento, placas com divisória e especular, cabeça angular com visor, comida como cristal dourado, reflexo no chão. Sem mudanças no loop de tempo fixo, controles, dificuldade, fruta especial ou pontuação.
- Nenhuma alteração de banco de dados ou regras de jogo.
