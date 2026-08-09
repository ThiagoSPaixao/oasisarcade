import cardEngrenagem from "@/assets/card-engrenagem.jpg.asset.json";
import cardChip from "@/assets/card-chip.jpg.asset.json";
import cardMaos from "@/assets/card-maos.jpg.asset.json";
import cardBateria from "@/assets/card-bateria.jpg.asset.json";
import cardRede from "@/assets/card-rede.jpg.asset.json";
import cardSatelite from "@/assets/card-satelite.jpg.asset.json";
import cardCerebro from "@/assets/card-cerebro.jpg.asset.json";
import cardCadeado from "@/assets/card-cadeado.jpg.asset.json";
import cardPrisma from "@/assets/card-prisma.jpg.asset.json";
import cardOlho from "@/assets/card-olho.jpg.asset.json";
import cardPulmoes from "@/assets/card-pulmoes.jpg.asset.json";
import cardBraco from "@/assets/card-braco.jpg.asset.json";
import cardDrone from "@/assets/card-drone.jpg.asset.json";
import cardDna from "@/assets/card-dna.jpg.asset.json";
import cardAtomo from "@/assets/card-atomo.jpg.asset.json";
import cardSolar from "@/assets/card-solar.jpg.asset.json";

export type MemoryIcon = { id: string; label: string; url: string };

/** Ícones neon usados como faces das cartas do jogo da memória. */
export const MEMORY_ICONS: MemoryIcon[] = [
  { id: "engrenagem", label: "Engrenagem cibernética", url: cardEngrenagem.url },
  { id: "chip", label: "Chip processador", url: cardChip.url },
  { id: "cerebro", label: "Cérebro de IA", url: cardCerebro.url },
  { id: "bateria", label: "Célula de energia", url: cardBateria.url },
  { id: "rede", label: "Rede neural", url: cardRede.url },
  { id: "satelite", label: "Antena de satélite", url: cardSatelite.url },
  { id: "cadeado", label: "Cadeado de segurança", url: cardCadeado.url },
  { id: "prisma", label: "Prisma de luz", url: cardPrisma.url },
  { id: "olho", label: "Olho cibernético", url: cardOlho.url },
  { id: "dna", label: "Hélice de DNA", url: cardDna.url },
  { id: "maos", label: "Mãos cibernéticas", url: cardMaos.url },
  { id: "atomo", label: "Reator atômico", url: cardAtomo.url },
  { id: "braco", label: "Braço robótico", url: cardBraco.url },
  { id: "drone", label: "Drone", url: cardDrone.url },
  { id: "pulmoes", label: "Pulmões biônicos", url: cardPulmoes.url },
  { id: "solar", label: "Painel solar", url: cardSolar.url },
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
