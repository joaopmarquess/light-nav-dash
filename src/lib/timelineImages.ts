import { HOSPITAL_PALMERIO } from "@/lib/uberabaHospital";
import campanha from "@/assets/uberaba-marketing-outdoor-sem-exclamacao.png";
import operacaoDigital from "@/assets/uberaba-guias-operacao-digital.jpg";

// Keep decoded images alive across stage changes, including the first visit.
const imagens: HTMLImageElement[] = [];

export function anteciparImagensTimeline() {
  if (imagens.length > 0) return;
  for (const src of [HOSPITAL_PALMERIO.imagem_fachada_url, HOSPITAL_PALMERIO.imagem_assistencial_url, campanha, operacaoDigital]) {
    if (!src) continue;
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = src;
    document.head.appendChild(preload);
    const imagem = new Image();
    imagem.loading = "eager";
    imagem.src = src;
    imagens.push(imagem);
    void imagem.decode().catch(() => undefined);
  }
}