import { createFileRoute } from "@tanstack/react-router";
import { GameCarousel } from "@/components/dashboard/GameCarousel";
import type { Game } from "@/types/arcade";

export const Route = createFileRoute("/test-carousel")({
  component: TestCarousel,
});

const mockGames: Game[] = [
  {
    slug: "tetris",
    name: "Tetris",
    description: "Monte linhas com blocos que caem cada vez mais rápido no clássico eterno.",
    is_premium: false,
    state: "playable",
    thumbnail: null,
    created_at: new Date().toISOString(),
  },
  {
    slug: "snake",
    name: "Snake",
    description: "Controle a cobra, coma as frutas e cresça sem bater nas paredes.",
    is_premium: false,
    state: "playable",
    thumbnail: null,
    created_at: new Date().toISOString(),
  },
  {
    slug: "space-shooter",
    name: "Space Shooter",
    description: "Destrua naves alienígenas e escale sua pontuação no espaço sideral.",
    is_premium: false,
    state: "playable",
    thumbnail: null,
    created_at: new Date().toISOString(),
  },
  {
    slug: "breakout",
    name: "Breakout",
    description: "Quebre todos os tijolos com a bola ricocheteando na sua raquete.",
    is_premium: false,
    state: "playable",
    thumbnail: null,
    created_at: new Date().toISOString(),
  },
];

function TestCarousel() {
  return (
    <div className="bg-background min-h-dvh px-4 py-6">
      <h1 className="text-foreground mb-2 text-center text-lg font-bold">Carousel Test</h1>
      <GameCarousel
        games={mockGames}
        scores={{ tetris: 1250, snake: 890, "space-shooter": 450, breakout: 300 }}
        favorites={[]}
        isPremiumUser={false}
        onToggleFavorite={() => {}}
      />
    </div>
  );
}
