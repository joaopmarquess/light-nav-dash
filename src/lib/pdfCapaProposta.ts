// Capa e sumário das propostas (Comercial, Credenciamento e Gestão de Rede, APB), pedido do Dênis em 19/11/2026:
// capa limpa, sem timbrado, com a logomarca grande do Bensaúde, título e mês/ano; no verso, o sumário com os tópicos e suas páginas.
// As páginas do sumário são as físicas do documento (capa = 1, sumário = 2), as mesmas do rodapé "Página X de Y".
import type jsPDF from "jspdf";
import bensaudeLogo from "@/assets/bensaude-logo.svg.asset.json";

type RGB = [number, number, number];
/** Logomarca em JPEG sobre fundo branco (a capa é branca): arquivo leve, sem transparência. */
export type LogoCapa = { dataUrl: string; largura: number; altura: number };
export type CapaProposta = {
  titulo: string; subtitulo?: string; destinatario?: string; mesAno: string; logo?: LogoCapa | null;
};
export type ItemSumario = { titulo: string; pagina: number };

/** Capa e sumário ficam antes do conteúdo. */
export const PAGINAS_ANTES_CONTEUDO = 2;

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
/** Só mês e ano, no horário de Brasília: "Novembro de 2026". */
export function mesAnoCapa(d: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric" }).formatToParts(d);
  const mes = Number(partes.find((p) => p.type === "month")?.value ?? d.getMonth() + 1);
  const ano = partes.find((p) => p.type === "year")?.value ?? String(d.getFullYear());
  return `${MESES[mes - 1]} de ${ano}`;
}

/** Páginas do conteúdo (contadas sem a capa e o sumário) convertidas nas páginas finais do documento. */
export function sumarioComCapa(itens: ItemSumario[]): ItemSumario[] {
  return itens.map((i) => ({ ...i, pagina: i.pagina + PAGINAS_ANTES_CONTEUDO }));
}

/** Logomarca do Bensaúde (SVG) convertida em PNG nítido para PDF e Word; sem navegador, devolve null (a capa usa o nome em texto). */
export async function carregarLogoBensaude(): Promise<LogoCapa | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bensaudeLogo.url;
    await img.decode();
    const escala = 4;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * escala;
    canvas.height = img.naturalHeight * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), largura: canvas.width, altura: canvas.height };
  } catch {
    return null;
  }
}

/** Bytes JPEG da logomarca (para o Word). */
export function bytesLogo(logo: LogoCapa): Uint8Array {
  const b64 = logo.dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type OpcoesCapa = {
  tinta: RGB; secundario: RGB;
  /** Controle do timbrado (attachTimbrado): desligado na capa, ligado no sumário. */
  timbrado?: { setEnabled: (v: boolean) => void };
  /** Topo do conteúdo do sumário (mm): abaixo do timbrado, quando houver. */
  topoSumario: number;
  margem: number;
};

/**
 * Insere a capa (página 1) e o sumário (página 2) antes do conteúdo já desenhado.
 * `itens` traz as páginas do conteúdo sem capa; devolve o sumário com as páginas finais.
 */
export function inserirCapaESumario(doc: jsPDF, capa: CapaProposta, itens: ItemSumario[], o: OpcoesCapa): ItemSumario[] {
  const sumario = sumarioComCapa(itens);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  // Sumário primeiro (com timbrado), depois a capa (sem timbrado) na frente dele.
  o.timbrado?.setEnabled(true);
  doc.insertPage(1);
  o.timbrado?.setEnabled(false);
  doc.insertPage(1);
  o.timbrado?.setEnabled(true);

  // ---------- Capa ----------
  doc.setPage(1);
  const cx = W / 2;
  if (capa.logo) {
    const largura = 130;
    const altura = largura * capa.logo.altura / capa.logo.largura;
    doc.addImage(capa.logo.dataUrl, "JPEG", cx - largura / 2, 62, largura, altura);
  } else {
    doc.setFont("helvetica", "bold"); doc.setFontSize(40); doc.setTextColor(...o.tinta);
    doc.text("Bensaúde", cx, 90, { align: "center" });
  }
  doc.setDrawColor(...o.tinta); doc.setLineWidth(0.8);
  doc.line(cx - 25, 128, cx + 25, 128);
  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(...o.tinta);
  const titulo = doc.splitTextToSize(capa.titulo, W - 2 * (o.margem + 10)) as string[];
  doc.text(titulo, cx, 146, { align: "center", lineHeightFactor: 1.25 });
  let y = 146 + (titulo.length - 1) * 24 * 0.3528 * 1.25 + 12;
  if (capa.subtitulo) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(15); doc.setTextColor(...o.secundario);
    doc.text(capa.subtitulo, cx, y, { align: "center" });
    y += 10;
  }
  if (capa.destinatario) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...o.secundario);
    doc.text("PARA", cx, 200, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...o.tinta);
    doc.text(capa.destinatario, cx, 208, { align: "center" });
  }
  doc.setDrawColor(...o.tinta); doc.setLineWidth(0.3);
  doc.line(o.margem, H - 42, W - o.margem, H - 42);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(...o.secundario);
  doc.text(capa.mesAno, cx, H - 32, { align: "center" });

  // ---------- Sumário ----------
  doc.setPage(2);
  const x0 = o.margem, x1 = W - o.margem;
  let ys = o.topoSumario;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...o.tinta);
  doc.text("SUMÁRIO", x0, ys);
  doc.setLineWidth(0.5); doc.line(x0, ys + 2.5, x1, ys + 2.5);
  ys += 14;
  doc.setFontSize(12);
  const LINHA = 12 * 0.3528 * 1.35;
  sumario.forEach((item) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
    const num = String(item.pagina);
    const larguraNum = doc.getTextWidth(num);
    const linhas = doc.splitTextToSize(item.titulo, x1 - x0 - larguraNum - 12) as string[];
    linhas.forEach((l, i) => doc.text(l, x0, ys + i * LINHA));
    const yUlt = ys + (linhas.length - 1) * LINHA;
    // Pontilhado entre o título e o número da página.
    const fimTexto = x0 + doc.getTextWidth(linhas[linhas.length - 1]) + 2;
    const inicioNum = x1 - larguraNum - 2;
    const ponto = doc.getTextWidth(".");
    const n = Math.max(0, Math.floor((inicioNum - fimTexto) / (ponto * 1.6)));
    doc.setTextColor(...o.secundario);
    for (let k = 0; k < n; k++) doc.text(".", fimTexto + k * ponto * 1.6, yUlt);
    doc.setTextColor(30, 30, 30);
    doc.text(num, x1, yUlt, { align: "right" });
    ys = yUlt + LINHA + 4;
  });
  doc.setPage(doc.getNumberOfPages());
  return sumario;
}
