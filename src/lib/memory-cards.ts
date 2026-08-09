export type MemoryIcon = { id: string; label: string; url: string };

/** Ícones neon usados como faces das cartas do jogo da memória (arquivos estáticos de /public/assets). */
export const MEMORY_ICONS: MemoryIcon[] = [
  { id: "engrenagem", label: "Engrenagem cibernética", url: "/assets/card-engrenagem.jpg" },
  { id: "chip", label: "Chip processador", url: "/assets/card-chip.jpg" },
  { id: "cerebro", label: "Cérebro de IA", url: "/assets/card-cerebro.jpg" },
  { id: "bateria", label: "Célula de energia", url: "/assets/card-bateria.jpg" },
  { id: "rede", label: "Rede neural", url: "/assets/card-rede.jpg" },
  { id: "satelite", label: "Antena de satélite", url: "/assets/card-satelite.jpg" },
  { id: "cadeado", label: "Cadeado de segurança", url: "/assets/card-cadeado.jpg" },
  { id: "prisma", label: "Prisma de luz", url: "/assets/card-prisma.jpg" },
  { id: "olho", label: "Olho cibernético", url: "/assets/card-olho.jpg" },
  { id: "dna", label: "Hélice de DNA", url: "/assets/card-dna.jpg" },
  { id: "maos", label: "Mãos cibernéticas", url: "/assets/card-maos.jpg" },
  { id: "atomo", label: "Reator atômico", url: "/assets/card-atomo.jpg" },
  { id: "braco", label: "Braço robótico", url: "/assets/card-braco.jpg" },
  { id: "drone", label: "Drone", url: "/assets/card-drone.jpg" },
  { id: "pulmoes", label: "Pulmões biônicos", url: "/assets/card-pulmoes.jpg" },
  { id: "solar", label: "Painel solar", url: "/assets/card-solar.jpg" },
];


/** Sorteia `count` ícones distintos para montar o tabuleiro. */
export function pickMemoryIcons(count: number): MemoryIcon[] {
  return [...MEMORY_ICONS].sort(() => Math.random() - 0.5).slice(0, count);
}

const preloaded = new Set<string>();

/** Baixa e decodifica as imagens antes do primeiro toque, evitando atraso ao virar a carta. */
export function preloadMemoryIcons(icons: MemoryIcon[] = MEMORY_ICONS): void {
  if (typeof window === "undefined") return;
  for (const icon of icons) {
    if (preloaded.has(icon.url)) continue;
    preloaded.add(icon.url);
    const img = new Image();
    img.decoding = "async";
    img.src = icon.url;
    void img.decode?.().catch(() => {});
  }
}
