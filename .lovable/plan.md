# Nova capa e cartas ilustradas no Jogo da Memória

## O que muda

1. **Capa do jogo da memória**: a imagem do cérebro neon com a carta de interrogação passa a ser a capa oficial do jogo (cards e carrossel do dashboard), substituindo a capa atual.
2. **Cartas com ilustrações**: as duas imagens em grade de ícones neon serão recortadas em ícones individuais (chip, cérebro AI, bateria, rede neural, satélite, prisma, cadeado, engrenagem, estrela, reator, fibra óptica, DNA, drone, etc.). Cada ícone vira a face de uma carta; o par é formado por duas cartas com o mesmo ícone.
3. **Verso da carta**: usa o padrão neon da carta de interrogação da imagem do cérebro (fundo escuro com "?" ciano/rosa), mantendo o estilo atual do jogo.
4. Comportamento do jogo, dificuldades (6/8/10 pares), pontuação e sons continuam iguais — só a arte muda.

## Detalhes técnicos

- Recorte dos ícones com Python/PIL a partir de `IMG_2154.png` (grade 5x3) e `IMG_2155.png` (grade 7x4), removendo as legendas de texto de cada tile e mantendo somente o símbolo central em fundo transparente/escuro. Selecionar os 10 ícones mais legíveis (o máximo de pares é 10).
- Ícones e capa enviados via `lovable-assets` como ponteiros `.asset.json` em `src/assets/`, sem binários no repositório.
- Novo módulo `src/lib/memory-cards.ts` exportando a lista de ícones (url + label acessível).
- `src/lib/game-covers.ts`: `memoria` passa a apontar para a nova capa do cérebro.
- `MemoryGame.tsx`: `buildDeck` passa a usar os ícones em vez dos símbolos unicode; a carta aberta renderiza `<img>` com `alt` do nome do ícone; carta fechada mantém o verso neon com "?". Grade, tamanhos e `game-fit` inalterados.
