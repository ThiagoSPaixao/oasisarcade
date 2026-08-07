# Arcade Oasis

Crie uma plataforma completa chamada "Retrô Arcade" usando React + TypeScript + Tailwind CSS com Supabase para autenticação e banco de dados. A plataforma deve ser Mobile-First e ter design nostálgico de arcade (cores neon, fontes pixeladas).

Requisitos funcionais:

1. Autenticação: Tela de login e registro (email/senha). Rotas protegidas (apenas /login e /register são públicas). Após login, redirecionar para /dashboard.

2. Dashboard (Home): 

   - Header com avatar, nome do usuário, nível/XP, plano atual (free/premium) e botão de logout.

   - Banner principal destacando "Jogo do Dia" com botão "Jogar Agora".

   - Grade de jogos organizada em categorias: "Mais Jogados", "Clássicos 8-Bits", "Meus Favoritos". Cada card tem thumbnail, nome, badge "Grátis" ou "Premium", e botão "Jogar".

3. Jogos:

   - Tela genérica GamePlayer que carrega o jogo selecionado.

   - Implementar o jogo Snake (funcional) usando Canvas, com controles por teclado e D-Pad virtual (para mobile). O Snake deve salvar a pontuação no Supabase (tabela user_scores) se for maior que o recorde.

   - Para Tetris, Arkanoid e Jogo de Nave, criar placeholders com mensagem "Em breve!".

   - D-Pad: componentes direcionais (cima, baixo, esquerda, direita) e botões A/B, que emitem eventos para o jogo ativo.

4. Banco de Dados (Supabase):

   - Criar tabelas: profiles, games, user_scores, subscriptions (conforme esquema fornecido).

   - Implementar RLS para proteger os dados.

5. Assinaturas:

   - Página/modal "Upgrade" com dois planos: Player 1 (grátis) e Player 2 (premium). Exibir benefícios e preços fictícios.

   - O campo plano_status no perfil deve ser atualizado ao simular uma assinatura.

6. Estilo: 

   - Fundo escuro com elementos neon, bordas pixeladas, fontes "Press Start 2P" e "Inter".

   - Totalmente responsivo: em mobile, D-Pad ocupa a parte inferior; em desktop, pode ficar ao lado do jogo.

   - Animações sutis (scanline, glow).

7. Estrutura de componentes modular, com pastas organizadas (components, contexts, hooks, lib, types, routes, styles). Use Zustand para estado global (auth e game).

Entregue o código completo, com todas as funcionalidades acima, pronto para ser executado no Lovable.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://oasisarcade.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0a246f14-0d45-43e0-95df-f8a8b981b047).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
