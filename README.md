# Oásis Arcade

Uma plataforma de jogos arcade retrô com ranking, XP, desafios e experiências
competitivas.

## Sobre

O Oásis Arcade é uma aplicação web mobile-first com estética neon 8-bit onde o
jogador cria sua conta e evolui jogando clássicos de fliperama. A plataforma
inclui:

- jogos retrô jogáveis diretamente no navegador;
- contas de usuário com perfil e avatar;
- XP e níveis calculados no servidor;
- ranking global por jogo;
- favoritos e histórico de partidas ("jogar novamente");
- desafios diários;
- conquistas;
- streak de dias jogados;
- arquitetura preparada para recursos Premium.

## Jogos

Jogos disponíveis atualmente (todos com pontuação integrada ao ranking e ao
sistema de XP):

| Jogo | Slug | Status |
| --- | --- | --- |
| Tetris | `tetris` | Disponível |
| Snake | `snake` | Disponível |
| Jogo da Memória | `memoria` | Disponível |
| Space Shooter | `space-shooter` | Disponível |
| Breakout | `breakout` | Disponível |
| Pong | `pong` | Disponível |
| Space Invaders | `space-invaders` | Em breve (desativado) |
| Mini Racer | `mini-racer` | Em breve (desativado) |

Jogos cadastrados no catálogo sem implementação aparecem automaticamente como
"Em breve" na interface.

## Tecnologias

- React 19 + TypeScript
- TanStack Start (roteamento por arquivos e server functions) + TanStack Query
- Vite
- Tailwind CSS
- Zustand (estado global de auth, som, configurações e jogos)
- Supabase (autenticação, banco de dados e regras de acesso)
- Stripe (assinatura Oásis Premium)
- Vercel (hospedagem)

## Arquitetura

- Roteamento por arquivos em `src/routes`, com área autenticada isolada.
- Catálogo de jogos centralizado em um Game Registry, com carregamento sob
  demanda de cada jogo (code-splitting).
- Regras de progressão (XP, nível, streak, conquistas, desafios) e validação de
  pontuação executadas no servidor/banco; o cliente apenas envia resultados de
  partida.
- Assinatura Premium confirmada por webhook de pagamento; o plano do jogador é
  sempre resolvido no servidor.
- Componentes de UI reutilizáveis com design system próprio em `src/styles.css`.

## Status

Projeto em desenvolvimento ativo.

## Desenvolvimento

Requisitos: Node.js e npm.

```sh
npm i
npm run dev
```

Scripts principais: `npm run dev`, `npm run build`, `npm run lint`,
`npm run format`.

As variáveis de ambiente necessárias são configuradas no ambiente de
hospedagem. Nenhum segredo deve ser versionado.

## Deploy

O build de produção é gerado com Vite/Nitro. Para a Vercel, o `vercel.json`
deste repositório define o preset de build adequado. As variáveis públicas do
Supabase e as chaves de servidor (pagamento e banco) precisam ser configuradas
no painel do provedor de hospedagem antes do deploy.

## Créditos

Desenvolvido por ThiagoS.Paixão.
