export type AvatarOption = { id: string; label: string; url: string };

/** Avatares neon pré-definidos (arquivos estáticos em /public/assets). */
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "controle", label: "Controle Arcade", url: "/assets/avatar-controle.jpg" },
  { id: "espada", label: "Espada Cyber", url: "/assets/avatar-espada.jpg" },
  { id: "raposa", label: "Raposa Neon", url: "/assets/avatar-raposa.jpg" },
  { id: "robo", label: "Robô de Combate", url: "/assets/avatar-robo.jpg" },
  { id: "cerebro", label: "Cérebro Tecnológico", url: "/assets/avatar-cerebro.jpg" },
  { id: "cerebro-rosa", label: "Cérebro de IA", url: "/assets/avatar-cerebro-rosa.jpg" },
  { id: "xicara", label: "Xícara Futurista", url: "/assets/avatar-xicara.jpg" },
  { id: "livro", label: "Livro Holográfico", url: "/assets/avatar-livro.jpg" },
  { id: "oculos", label: "Óculos Neon", url: "/assets/avatar-oculos.jpg" },
  { id: "capacete", label: "Capacete Tático", url: "/assets/avatar-capacete.jpg" },
  { id: "gato", label: "Gato Cibernético", url: "/assets/avatar-gato.jpg" },
  { id: "dado", label: "Dado D20", url: "/assets/avatar-dado.jpg" },
  { id: "blaster", label: "Blaster Neon", url: "/assets/avatar-blaster.jpg" },
  { id: "corrente", label: "Corrente Neon", url: "/assets/avatar-corrente.jpg" },
  { id: "circuito", label: "Porta Lógica", url: "/assets/avatar-circuito.jpg" },
  { id: "espiral", label: "Selo Espiral", url: "/assets/avatar-espiral.jpg" },
  { id: "chip", label: "Chip Neural", url: "/assets/avatar-chip.jpg" },
  { id: "engrenagem", label: "Engrenagem", url: "/assets/avatar-engrenagem.jpg" },
  { id: "estrela", label: "Estrela de Cristal", url: "/assets/avatar-estrela.jpg" },
  { id: "neural", label: "Rede Neural", url: "/assets/avatar-neural.jpg" },
  { id: "cadeado", label: "Cadeado Neon", url: "/assets/avatar-cadeado.jpg" },
];

const STORAGE_KEY = "oasis-arcade:avatar-url";

export function readStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeAvatar(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (url) window.localStorage.setItem(STORAGE_KEY, url);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* armazenamento indisponível */
  }
}
