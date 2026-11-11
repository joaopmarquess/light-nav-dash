import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GUIAS_UBERABA, type GuiasContent } from "@/lib/uberabaGuias";
import operacaoDigital from "@/assets/uberaba-guias-operacao-digital.jpg";

const INDICADORES = ["SEM PAPEL", "AUTORIZAÇÃO ONLINE", "AUDITORIA REMOTA", "ACOMPANHAMENTO DIGITAL"];

export default function UberabaGuias({ onBack, content = GUIAS_UBERABA }: { onBack?: () => void; content?: GuiasContent }) {
  const inicioRef = useRef<HTMLElement>(null);
  const [fluxoAberto, setFluxoAberto] = useState(false);
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const imagem = content.imagem_operacao_url ?? operacaoDigital;
  useEffect(() => setImagemFalhou(false), [imagem]);
  if (!content.status_ativo) return null;
  const etapas = content.etapas.filter((etapa) => etapa.status_ativo).sort((a, b) => a.ordem_exibicao - b.ordem_exibicao);
  const fluxo = content.fluxo.filter((item) => item.status_ativo).sort((a, b) => a.fluxo_ordem - b.fluxo_ordem);

  const tituloId = `${content.id}-titulo`;
  const fluxoId = `${content.id}-fluxo`;
  const indicadores = content.indicadores ?? INDICADORES;
  const resultadoItens = content.resultado_itens ?? ["Jornada sem papel", "Autorização online", "Acompanhamento remoto", "Redução de deslocamentos", "Integração entre cliente, prestador e Operadora"];

  return (
    <section ref={inicioRef} className="uberaba-guias" aria-labelledby={tituloId}>
      <div className="guias-page">
        <header className="guias-header">
          <div>
            <p>Bensaúde|Uberaba</p>
            <h3 id={tituloId}>{content.titulo ?? "Guias"}</h3>
            <p className="guias-subtitle">{content.subtitulo ?? "Jornada digital, sem papel e sem deslocamento ao Bensaúde"}</p>
          </div>
          {onBack && <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" />Voltar ao Modelo de Atuação</Button>}
        </header>
        <div className="guias-body">
          <ol className="guias-stages" aria-label={content.rotulo_etapas ?? "Jornada operacional"}>
            {etapas.map((etapa) => (
              <li key={etapa.id} className={`guias-stage guias-tone-${etapa.etapa_cor}`}>
                <span className="guias-number">{etapa.etapa_numero}</span>
                <div><h3>{etapa.etapa_titulo}</h3><p>{etapa.etapa_descricao}</p></div>
              </li>
            ))}
          </ol>
          <div className="guias-media">
            <figure className="guias-figure">
              {imagemFalhou ? <div className="guias-placeholder"><ImageOff aria-hidden="true" className="h-6 w-6" />{content.imagem_placeholder ?? "Imagem da operação digital"}</div> : <img src={imagem} onError={() => setImagemFalhou(true)} loading="eager" decoding="sync" width={1536} height={1024} alt={content.imagem_alt ?? "Operação digital de autorização de guias com recepção, computadores, auditoria remota e aplicativo com carteirinha virtual."} />}
              <figcaption>{content.texto_imagem}</figcaption>
            </figure>
            <ul className="guias-indicators" aria-label="Indicadores da operação">{indicadores.map((item, index) => <li key={item} className={`guias-indicator-${index + 1}`}>{item}</li>)}</ul>
          </div>
        </div>
        <section className="guias-result" aria-labelledby={`${content.id}-resultado`}>
          <h3 id={`${content.id}-resultado`}>{content.resultado_titulo}</h3>
          <div><p className="guias-result-main">{content.resultado_descricao}</p><ul>{resultadoItens.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>
        <div className="guias-flow">
          <p className="guias-premise">{content.premissa ?? "A jornada proposta elimina a guia física e reduz a necessidade de atendimento presencial no Bensaúde."}</p>
          <Button variant="outline" size="sm" aria-expanded={fluxoAberto} aria-controls={fluxoId} onClick={() => setFluxoAberto(!fluxoAberto)}>
            VER FLUXO COMPLETO<ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${fluxoAberto ? "rotate-180" : ""}`} />
          </Button>
          {fluxoAberto && <ol id={fluxoId} className="guias-flow-list">{fluxo.map((item) => <li key={item.id}><span>{item.fluxo_ordem}</span><p>{item.fluxo_item}</p></li>)}</ol>}
        </div>
        <p className="guias-observation">{content.observacao}</p>
      </div>
    </section>
  );
}