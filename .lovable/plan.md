# Snake com animação realmente fluida

## Objetivo

Eliminar os engasgos perceptíveis no Snake em celulares, mantendo o visual atual, os controles e as regras do jogo.

## Implementação

1. **Estabilizar o loop do jogo**
   - Separar claramente a atualização lógica da renderização.
   - Substituir o controle atual por um acumulador de tempo com passos fixos e interpolação.
   - Preservar o tempo restante entre frames e limitar a recuperação após atrasos, evitando saltos, desaceleração e movimentos irregulares.

2. **Reduzir o custo do canvas**
   - Aplicar resolução interna adaptativa, com limite menor em celulares de alta densidade de pixels sem alterar o tamanho visual.
   - Reutilizar estruturas e cálculos do desenho em vez de recriá-los a cada frame.
   - Pré-renderizar em camadas os elementos estáticos e efeitos caros que não precisam ser recalculados continuamente.
   - Trocar sombras e gradientes recriados por frame por equivalentes em cache, preservando a aparência neon.

3. **Tornar efeitos independentes da taxa de quadros**
   - Atualizar partículas, tremor e animações usando o delta de tempo real.
   - Limitar partículas simultâneas para evitar quedas de FPS ao coletar frutas.
   - Suspender o loop quando a aba não estiver visível e retomá-lo sem acumular atraso.

4. **Validar a fluidez**
   - Medir intervalos de `requestAnimationFrame`, frames longos e estabilidade durante movimento e coleta de frutas.
   - Testar em viewport móvel com alta densidade de pixels e em desktop.
   - Confirmar que direção, pausa, colisões, pontuação, fruta especial e game over continuam funcionando.

## Arquivos principais

- `src/components/games/SnakeGame.tsx`: loop, interpolação, renderização e efeitos otimizados.
- Nenhuma mudança no banco de dados ou nas regras de pontuação.