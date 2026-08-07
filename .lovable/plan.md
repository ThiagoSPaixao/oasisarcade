# Retrô Arcade — plataforma de jogos retrô

Plataforma mobile-first com estética arcade neon: login, dashboard de jogos, Snake jogável com D-Pad, placeholders para os outros jogos, e planos Player 1 / Player 2.

## Backend (Lovable Cloud)

Ativo o backend integrado (banco + autenticação, sem contas externas) e crio:

- `profiles` — id (ligado ao usuário), username, avatar_url, level, xp, plan_status (`free` | `premium`); criado automaticamente no cadastro por trigger.
- `games` — slug, nome, categoria (`mais_jogados` | `classicos_8bits`), is_premium, thumbnail, status (`playable` | `soon`); leitura pública. Já populado com Snake, Tetris, Arkanoid e Jogo de Nave via migração.
- `user_scores` — user_id, game_slug, score, created_at; recorde por usuário/jogo.
- `favorites` — user_id + game_slug (necessário para a aba "Meus Favoritos").
- `subscriptions` — user_id, plano, status, período; atualizada na simulação de assinatura.

RLS em tudo: cada usuário só lê/escreve os próprios dados; `games` é leitura pública. Sem cobrança real — o upgrade é simulado e grava plano premium no perfil.

## Telas

1. **/login e /register** (públicas) — email/senha, validação, mensagens de erro em PT-BR. Cadastro entra direto (confirmação de e-mail desativada) para não travar o teste.
2. **/dashboard** (protegida) — header com avatar, nome, barra de nível/XP, badge do plano e logout; banner "Jogo do Dia" com "Jogar Agora"; trilhos horizontais de cards por categoria (Mais Jogados, Clássicos 8-Bits, Meus Favoritos) com thumbnail, badge Grátis/Premium, botão Jogar e ícone de favoritar.
3. **/game/$slug** (protegida) — GamePlayer genérico: moldura de fliperama, título, recorde atual, e área do jogo. Jogo premium para usuário free abre o modal de Upgrade.
4. **/upgrade** + modal — Player 1 (grátis) e Player 2 (premium, preço fictício) com benefícios; "Assinar" simula a assinatura e atualiza o plano na hora.

## Jogos

- **Snake funcional** em Canvas: grid, crescimento, colisão, velocidade progressiva, pausa e game over. Teclado (setas/WASD) no desktop, D-Pad virtual no mobile. Ao terminar, salva a pontuação apenas se superar o recorde e concede XP.
- **Tetris, Arkanoid, Nave**: tela "Em breve!" no mesmo layout arcade.
- **D-Pad**: componente com direcionais + botões A (confirmar/reiniciar) e B (pausar), publicando eventos num barramento que o jogo ativo escuta. No mobile fica fixo na parte inferior; no desktop, ao lado do canvas.

## Visual

Fundo quase preto com grid em perspectiva, neon magenta/ciano/amarelo, bordas pixeladas, sombras glow, scanline e leve flicker em CRT. Fonte "Press Start 2P" para títulos e "Inter" para textos, carregadas via `<link>` no root. Tudo em tokens semânticos no design system (sem cores fixas nos componentes) e responsivo de 320px para cima.

## Detalhes técnicos

- Rotas de arquivo do TanStack Router: `/login`, `/register` públicas; dashboard, game e upgrade sob o layout autenticado `_authenticated`, que redireciona quem não está logado.
- Zustand para estado global: store de auth (sessão + perfil) e store de game (jogo ativo, score, estado de execução, input do D-Pad).
- Pastas: `src/components` (arcade, dashboard, games, ui), `src/stores`, `src/hooks`, `src/lib`, `src/types`, `src/routes`.
- Leituras e escritas de score/favoritos/plano por funções de servidor autenticadas, respeitando RLS; catálogo de jogos com leitura pública.
- `head()` com título e descrição próprios em cada rota pública.

## Fora de escopo

Pagamento real, Tetris/Arkanoid/Nave jogáveis, ranking global e multiplayer.
