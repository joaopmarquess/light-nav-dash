import { useEffect, useMemo, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle2, Loader2, PenLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { lerFatores, lerIndicadores, lerIndices, lerRotulos } from "@/lib/uberabaTabelasComerciais";
import {
  SECOES_FIXAS, SECOES_IA, SECOES_TEXTO, TEXTOS_PADRAO, aprovarTextos, assinaturaDados, dadosRascunho, gravarTextos, lerTextos, mesclarRascunhoIa, normalizarTextos,
  numerosForaDasTabelas, pendencias, textosPadrao, type EstadoTextos, type TextosSecoes,
} from "@/lib/uberabaPropostaTextos";

const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");

async function mensagemErro(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try { const b = await error.context.json(); if (typeof b?.error === "string") return b.error; } catch { /* mensagem padrão */ }
  }
  return "Não foi possível gerar o rascunho agora. Tente novamente em instantes.";
}

/**
 * Textos da Proposta Comercial (tópicos 1 a 5): parte do texto padrão, permite a revisão, gera com a IA só os tópicos 3 a 5
 * a partir das tabelas de Resultados Comerciais e só inclui no PDF depois de "Incluir no PDF".
 */
export default function UberabaPropostaTextosButton() {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<EstadoTextos>(() => lerTextos());
  const [edicao, setEdicao] = useState<TextosSecoes>(() => lerTextos().rascunho ?? textosPadrao());
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const controle = useRef<AbortController | null>(null);

  // Os dados são relidos ao abrir: as tabelas podem ter mudado desde o último rascunho.
  const [versao, setVersao] = useState(0);
  const dados = useMemo(() => dadosRascunho(lerIndices(), lerIndicadores(), lerRotulos(), lerFatores()), [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  const assinatura = useMemo(() => assinaturaDados(dados), [dados]);

  useEffect(() => () => controle.current?.abort(), []);

  const abrir = () => {
    const e = lerTextos();
    setEstado(e);
    setEdicao(e.rascunho ?? textosPadrao());
    setErro(null);
    setVersao((v) => v + 1);
    setAberto(true);
  };

  const salvar = (novo: EstadoTextos) => { setEstado(novo); gravarTextos(novo); };

  const editar = (id: keyof TextosSecoes, texto: string) => {
    const prox = { ...edicao, [id]: texto };
    setEdicao(prox);
    salvar({ ...estado, rascunho: prox });
  };

  const gerar = async () => {
    setErro(null);
    setGerando(true);
    const ac = new AbortController();
    controle.current = ac;
    try {
      const contexto = Object.fromEntries(SECOES_FIXAS.map((id) => [id, edicao[id]]));
      const { data, error } = await supabase.functions.invoke("uberaba-proposta-rascunho", { body: { dados, contexto }, signal: ac.signal });
      if (ac.signal.aborted) return;
      if (error || data?.error) throw new Error(data?.error ?? (await mensagemErro(error)));
      const ia = normalizarTextos(data?.textos);
      if (!ia.tabelas && !ia.remuneracao && !ia.conclusao) throw new Error("A IA não devolveu texto. Tente gerar novamente.");
      const textos = mesclarRascunhoIa(edicao, data?.textos);
      setEdicao(textos);
      salvar({ ...lerTextos(), rascunho: textos, assinaturaRascunho: assinatura, geradoEm: new Date().toISOString() });
    } catch (e) {
      if (!ac.signal.aborted) setErro(e instanceof Error ? e.message : String(e));
    } finally {
      if (controle.current === ac) controle.current = null;
      setGerando(false);
    }
  };

  const cancelar = () => { controle.current?.abort(); setGerando(false); };

  const incluir = () => {
    salvar(aprovarTextos(estado, edicao));
    toast.success("Textos incluídos na Proposta Comercial.");
  };

  const removerDoPdf = () => {
    salvar({ ...estado, aprovado: null, assinaturaAprovado: null, aprovadoEm: null });
    toast.success("A Proposta volta a usar o texto padrão.");
  };

  const descartar = () => {
    setEdicao(textosPadrao());
    salvar({ ...estado, rascunho: null, assinaturaRascunho: null, geradoEm: null });
  };

  const tabelasMudaram = !!estado.rascunho && !!estado.assinaturaRascunho && estado.assinaturaRascunho !== assinatura;
  const aprovadoDesatualizado = !!estado.aprovado && !!estado.assinaturaAprovado && estado.assinaturaAprovado !== assinatura;
  const ehPadrao = SECOES_TEXTO.every((s) => normalizarTextos(edicao)[s.id] === TEXTOS_PADRAO[s.id]);
  const igualAoAprovado = !!estado.aprovado && SECOES_TEXTO.every((s) => normalizarTextos(edicao)[s.id] === estado.aprovado![s.id]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Textos da Proposta Comercial" onClick={abrir}>
            <PenLine />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Textos da Proposta Comercial</TooltipContent>
      </Tooltip>

      <Dialog open={aberto} onOpenChange={(v) => { if (!v) cancelar(); setAberto(v); }}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Textos da Proposta Comercial</DialogTitle>
            <DialogDescription>
              Os tópicos 1 e 2 trazem o seu texto; a IA só redige os tópicos 3 a 5, somente com os dados das tabelas de Resultados Comerciais. Revise e clique em “Incluir no PDF”.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {estado.aprovado
              ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> No PDF: textos revisados em {dataHora(estado.aprovadoEm)}</span>
              : <span>No PDF: texto padrão</span>}
            {estado.geradoEm && <span>Rascunho gerado em {dataHora(estado.geradoEm)}</span>}
          </div>

          {(tabelasMudaram || aprovadoDesatualizado) && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {tabelasMudaram
                ? "As tabelas mudaram depois que este rascunho foi gerado. Gere um novo rascunho ou confira os números."
                : "As tabelas mudaram depois que os textos foram incluídos no PDF. Confira os números ou gere um novo rascunho."}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={gerar} disabled={gerando}>
              {gerando ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {gerando ? "Gerando tópicos 3 a 5…" : "Gerar tópicos 3 a 5 com IA"}
            </Button>
            {gerando && <Button variant="ghost" onClick={cancelar}>Cancelar</Button>}
            {!gerando && <span className="text-xs text-muted-foreground">Substitui só os tópicos 3, 4 e 5; os tópicos 1 e 2 ficam como estão.</span>}
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex flex-col divide-y divide-border">
            {SECOES_TEXTO.map((s) => {
              const texto = edicao[s.id];
              const fora = (SECOES_IA as readonly string[]).includes(s.id) ? numerosForaDasTabelas(texto, dados) : [];
              const faltas = pendencias(texto);
              return (
                <section key={s.id} className="flex flex-col gap-1.5 py-3">
                  <label htmlFor={`texto-${s.id}`} className="text-sm font-semibold">{s.titulo}</label>
                  <Textarea
                    id={`texto-${s.id}`}
                    value={texto}
                    onChange={(e) => editar(s.id, e.target.value)}
                    rows={Math.min(12, Math.max(3, Math.ceil(texto.length / 110) + texto.split("\n").length))}
                    className="text-sm leading-6"
                    lang="pt-BR"
                  />
                  <div className="flex flex-wrap gap-x-4 text-xs">
                    {fora.length > 0 && <span className="text-destructive">Números que não estão nas tabelas: {fora.join(", ")}</span>}
                    {faltas.length > 0 && <span className="text-muted-foreground">{faltas.length === 1 ? "1 item a definir" : `${faltas.length} itens a definir`}</span>}
                    {!texto.trim() && <span className="text-muted-foreground">Sem texto: o tópico sai vazio no PDF.</span>}
                  </div>
                </section>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {!ehPadrao && <Button variant="ghost" onClick={descartar} disabled={gerando}>Voltar ao texto padrão</Button>}
              {estado.aprovado && <Button variant="ghost" onClick={removerDoPdf} disabled={gerando}>Tirar do PDF</Button>}
            </div>
            <Button onClick={incluir} disabled={gerando || igualAoAprovado}>
              {igualAoAprovado ? "Já está no PDF" : "Incluir no PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
