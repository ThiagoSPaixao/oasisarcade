# Animação neon de virar carta no Jogo da Memória

## O que muda

Ao tocar ou clicar em uma carta, ela gira em 3D (efeito de virada real, não troca instantânea) com um brilho neon acompanhando o movimento:

1. **Giro 3D suave** de ~350ms com curva de easing arcade: o verso com "?" gira para fora e a face com o ícone entra no lugar.
2. **Pulso neon** durante a virada: um halo ciano/rosa aparece nas bordas da carta enquanto ela gira e desaparece ao final.
3. **Par encontrado**: brilho verde neon com um pulso curto de confirmação.
4. **Par errado**: as duas cartas giram de volta com a mesma animação, mantendo o tempo atual de 750ms.
5. Feedback de toque imediato preservado (leve compressão ao pressionar) e respeito a `prefers-reduced-motion`: quem prefere menos movimento vê apenas um fade rápido, sem giro.

Regras do jogo, pontuação, sons, dificuldades e layout continuam iguais. As imagens seguem pré-carregadas, então a animação não adiciona atraso.

## Detalhes técnicos

- `src/styles.css`: novas utilities/keyframes — `card-flip-scene` (perspective), `card-flip-inner` (transform-style: preserve-3d, transition de `transform`), `card-face`/`card-face-back` (backface-visibility: hidden, rotateY(180deg)), e `@keyframes card-neon-pulse` para o halo via `box-shadow` nos tokens neon existentes. Bloco `@media (prefers-reduced-motion: reduce)` desativa o giro e usa opacidade.
- `src/components/games/MemoryGame.tsx`: cada carta passa a ser um `<button>` com wrapper de cena e um inner que recebe `rotate-y-180` quando `flipped || matched`; face frontal = verso neon com "?", face traseira = `<img>` do ícone (mantendo `fetchPriority`/`decoding` atuais e ambas sempre no DOM). Classes de estado (`pixel-border-cyan`, `bg-neon-green/15`) migram para a face correspondente. `aria-label` continua refletindo aberta/fechada.
- Sem mudanças em lógica de jogo, timers de comparação, assets ou backend.
