// Word das propostas "Administrados" e "Empresariais": mesmo conteúdo de propostaGrupo e mesma capa/sumário do PDF,
// no modelo de Word da Proposta de Rede, para o Word nunca divergir do PDF.
import { Packer } from "docx";
import { mesAnoCapa, type ItemSumario, type LogoCapa } from "@/lib/pdfCapaProposta";
import { type PropostaGrupo, type TabelaProdutoGrupo } from "@/lib/uberabaPropostaGrupo";
import { buildPropostaGrupoPdf } from "@/lib/uberabaPropostaGrupoPdf";
import { documentoPropostaRede } from "@/lib/uberabaPropostaRedeDocx";
import { blocosFecho, mesAnoVersao, type FechoProposta } from "@/lib/propostaVersao";
import { type BlocoPropostaRede } from "@/lib/uberabaPropostaRede";

const percentual = (v: number) => `${v.toLocaleString("pt-BR", { minimumIntegerDigits: 2, maximumFractionDigits: 2 })}%`;

function tabela(t: TabelaProdutoGrupo, aviso?: string, somenteSubtitulo = false): BlocoPropostaRede[] {
  return [
    ...(!somenteSubtitulo ? [{ tipo: "subtopico" as const, texto: t.titulo }] : []),
    ...(t.subtitulo ? [{ tipo: "rotulo" as const, texto: t.subtitulo }] : []),
    { tipo: "quadro", cabecalho: ["FAIXA", "ENFERMARIA", "APARTAMENTO"], linhas: t.linhas, larguras: [1, 1, 1], alinhamentos: ["center", "center", "center"], grupos: false, itens: [], negritoUltima: false, juntos: true, avisoPrecos: aviso },
  ];
}

/** Blocos da proposta na mesma ordem do PDF. */
export function blocosPropostaGrupo(p: PropostaGrupo): BlocoPropostaRede[] {
  const b: BlocoPropostaRede[] = [];
  const topico = (texto: string, novaPagina = false) => b.push({ tipo: "topico", texto, novaPagina });
  const par = (texto: string) => b.push({ tipo: "paragrafo", texto });
  const [t0, t1, t2, t3] = p.introducao.length ? p.topicos.slice(1) : p.topicos;
  if (p.introducao.length) { topico(p.topicos[0]); p.introducao.forEach(par); }
  if (p.produtosEmpresariais.length) {
    topico(t0);
    p.produtosEmpresariais.forEach((pr) => b.push(...tabela(pr.tabela, pr.avisoPreco, true)));
    topico(t1, true);
    if (p.agenciamento) {
      par(`• Vitalício: ${percentual(p.agenciamento.vitalicio)}`);
      par(`• Comissionamento Contratual: ${percentual(p.agenciamento.contratual)}`);
    }
  } else {
    topico(t0); p.net.forEach((t) => b.push(...tabela(t)));
    topico(t1);
    if (p.sugestaoVenda) par(p.sugestaoVenda); else p.venda.forEach((t) => b.push(...tabela(t)));
  }
  topico(t2);
  p.distribuidores.forEach((d) => { par(`• ${d}`); if (p.definicoes[d]) par(p.definicoes[d]); });
  topico(t3);
  par(p.promocao);
  p.metas.forEach((m) => par(`• ${m}`));
  return b;
}

export async function buildPropostaGrupoDocx(p: PropostaGrupo, timbrado: Uint8Array | null, logo: LogoCapa | null = null, fecho?: FechoProposta): Promise<Blob> {
  // Páginas do sumário vêm da paginação do PDF (o Word as atualiza com F9).
  let sumario: ItemSumario[] = [];
  const pdf = buildPropostaGrupoPdf(p, null, null, (s) => { sumario = s; }, fecho);
  const capa = { titulo: "Proposta Comercial", subtitulo: `Bensaúde|Uberaba · ${p.nome}`, mesAno: fecho ? mesAnoVersao(fecho) : mesAnoCapa(), logo };
  return Packer.toBlob(documentoPropostaRede([...blocosPropostaGrupo(p), ...blocosFecho(fecho)], timbrado, { capa, sumario, totalPaginas: pdf.getNumberOfPages() - 1 }, `Proposta Comercial — Bensaúde|Uberaba · ${p.nome}`));
}
