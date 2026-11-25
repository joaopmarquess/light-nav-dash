import { it, expect } from "vitest";
import JSZip from "jszip";
import { propostaGrupo } from "@/lib/uberabaPropostaGrupo";
import { buildPropostaGrupoDocx, blocosPropostaGrupo } from "@/lib/uberabaPropostaGrupoDocx";
it("word", async () => { for (const id of ["administrados","empresariais"] as const) { const p=propostaGrupo(id); expect(blocosPropostaGrupo(p).filter(b=>b.tipo==="topico").length).toBe(p.topicos.length); const b=await buildPropostaGrupoDocx(p,null); expect(b.size).toBeGreaterThan(1000);} });

it("preserva a tabela indicativa PJ+ e as faixas sem atribuir preços", async () => {
  const p = propostaGrupo("empresariais");
  const pj = p.produtosEmpresariais.find((produto) => produto.tabela.id === "pce100");
  expect(pj).toBeDefined();
  if (!pj) throw new Error("Produto PJ+ ausente");
  const quadros = blocosPropostaGrupo(p).filter((b) => b.tipo === "quadro");
  expect(quadros).toHaveLength(2);
  expect(quadros[1].linhas).toEqual(pj.tabela.linhas);
  expect(quadros[1].linhas).toHaveLength(10);
  expect(quadros[1].linhas.every(([, enf, apt]) => enf === "" && apt === "")).toBe(true);
  expect(quadros[1].avisoPrecos).toBe(pj.avisoPreco);

  const blob = await buildPropostaGrupoDocx(p, null);
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Word inválido"));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  const zip = await JSZip.loadAsync(bytes);
  const documento = zip.file("word/document.xml");
  if (!documento) throw new Error("Documento Word ausente");
  const xml = await documento.async("string");
  const tabelas = xml.match(/<w:tbl>.*?<\/w:tbl>/gs) ?? [];
  expect(tabelas).toHaveLength(2);
  expect(tabelas[1].match(/<w:tr>/g)).toHaveLength(11);
  expect(tabelas[1].match(/<w:gridSpan w:val="2"\/>/g)).toHaveLength(10);
  expect(tabelas[1].match(/<w:vMerge w:val="restart"\/>/g)).toHaveLength(1);
  expect(tabelas[1].match(/<w:vMerge w:val="continue"\/>/g)).toHaveLength(9);
});
