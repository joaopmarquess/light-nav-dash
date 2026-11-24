import { it, expect } from "vitest";
import { propostaGrupo } from "@/lib/uberabaPropostaGrupo";
import { buildPropostaGrupoDocx, blocosPropostaGrupo } from "@/lib/uberabaPropostaGrupoDocx";
it("word", async () => { for (const id of ["administrados","empresariais"] as const) { const p=propostaGrupo(id); expect(blocosPropostaGrupo(p).filter(b=>b.tipo==="topico").length).toBe(p.topicos.length); const b=await buildPropostaGrupoDocx(p,null); expect(b.size).toBeGreaterThan(1000);} });
