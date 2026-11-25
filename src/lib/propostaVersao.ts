// Versão, data de impressão e nota de revisão das propostas (modelo PDF de 25/11/2026): a capa mostra "Mês de Ano (vN)",
// a última página traz a data da impressão à direita e, ao pé, a nota "Versão N | ..." digitada pelo usuário.
import type { jsPDF } from "jspdf";
import { mesAnoCapa } from "@/lib/pdfCapaProposta";

export const VERSAO_INICIAL_PROPOSTA = 2;
export type FechoProposta = { versao: number; nota: string; data: Date };

const chave = (id: string) => `axis.proposta.versao.${id}`;

/** Última versão emitida (0 quando nenhuma). */
export function ultimaVersaoProposta(id: string, storage: Pick<Storage, "getItem"> = localStorage): number {
  const n = Number(storage.getItem(chave(id)));
  return Number.isInteger(n) && n > 0 ? n : 0;
}
/** Próxima versão: sequencial a partir de v2. */
export function proximaVersaoProposta(id: string, storage: Pick<Storage, "getItem"> = localStorage): number {
  return Math.max(VERSAO_INICIAL_PROPOSTA, ultimaVersaoProposta(id, storage) + 1);
}
export function registrarVersaoProposta(id: string, versao: number, storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(chave(id), String(versao));
}

export function mesAnoVersao(f: FechoProposta): string { return `${mesAnoCapa(f.data)} (v${f.versao})`; }
/** Data da impressão no horário de Brasília: "25/11/2026". */
export function dataImpressaoProposta(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
export function notaVersaoProposta(f: FechoProposta): string {
  const nota = f.nota.trim();
  return nota ? `Versão ${f.versao} | ${nota}` : `Versão ${f.versao}`;
}

/** Desenha data (à direita, após o conteúdo) e nota (itálico, ao pé da última página); abre página se não couber. */
export function desenharFechoPdf(doc: jsPDF, f: FechoProposta, o: {
  y: number; top: number; bottom: number; marginL: number; largura: number; fonte: number; cor: [number, number, number]; texto: (t: string) => string;
}) {
  const pageH = doc.internal.pageSize.getHeight();
  const linha = o.fonte * 0.3528 * 1.35;
  doc.setFont("helvetica", "italic"); doc.setFontSize(o.fonte);
  const linhas = doc.splitTextToSize(o.texto(notaVersaoProposta(f)), o.largura) as string[];
  const alturaNota = linhas.length * linha;
  let y = o.y + 10;
  if (y + linha + 20 + alturaNota > pageH - o.bottom) { doc.addPage(); y = o.top + 6; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(o.fonte); doc.setTextColor(...o.cor);
  doc.text(dataImpressaoProposta(f.data), o.marginL + o.largura, y, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.text(linhas, o.marginL, pageH - o.bottom - alturaNota + linha, { align: "justify", maxWidth: o.largura, lineHeightFactor: 1.35 });
}

/** Blocos do Word: data à direita e nota em itálico, como no PDF. */
export function blocosFecho(f?: FechoProposta): { tipo: "fecho"; data: string; nota: string }[] {
  return f ? [{ tipo: "fecho", data: dataImpressaoProposta(f.data), nota: notaVersaoProposta(f) }] : [];
}
