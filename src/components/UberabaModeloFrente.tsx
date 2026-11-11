import { useEffect, useState, type CSSProperties } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ModeloFrenteContent } from "@/lib/uberabaFrentes";

// Frentes do Modelo de Atuação (Comercial, Rede Assistencial): mesma composição e identidade visual da tela Guias.
export default function UberabaModeloFrente({ content }: { content: ModeloFrenteContent }) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  useEffect(() => setImagemFalhou(false), [content.imagem_url]);
  const tituloId = `${content.id}-titulo`;
  const destaqueId = `${content.id}-destaque`;
  const imagem = <img src={content.imagem_url} onError={() => setImagemFalhou(true)} loading="eager" decoding="sync" width={1536} height={1024} alt={content.imagem_alt} />;

  return (
    <section className="uberaba-guias modelo-comercial" aria-labelledby={tituloId}>
      <div className="guias-page">
        <header className="guias-header">
          <div>
            <p>Bensaúde|Uberaba</p>
            <h3 id={tituloId}>{content.titulo}</h3>
            {content.subtitulo && <p className="guias-subtitle">{content.subtitulo}</p>}
          </div>
        </header>
        <div className="guias-body">
          <div className="comercial-grupos">
            {content.grupos.map((grupo) => (
              <section key={grupo.id} className="comercial-grupo" style={{ flexGrow: grupo.itens.length }} aria-labelledby={`${content.id}-${grupo.id}`}>
                <h4 id={`${content.id}-${grupo.id}`} className="comercial-grupo-titulo">{grupo.titulo}</h4>
                <ol className={`guias-stages ${grupo.colunas === 2 ? "frente-stages-2col" : ""}`}>
                  {grupo.itens.map((item) => (
                    <li key={item.id} className={`guias-stage guias-tone-${item.cor}`}>
                      <span className="guias-number">{item.numero}</span>
                      <div className="min-w-0">
                        <h3>{item.titulo}</h3>
                        {item.rotulo && <p className="comercial-rotulo">{item.rotulo}</p>}
                        {item.descricao && (Array.isArray(item.descricao) ? item.descricao : [item.descricao]).map((d) => <p key={d} className="frente-descricao">{d}</p>)}
                        {item.subitens && (
                          <ul className={`comercial-subitens ${item.rotulo || item.subitens.length > 2 ? "comercial-subitens-coluna" : ""}`} aria-label={`Integram ${item.titulo}`}>
                            {item.subitens.map((sub) => <li key={sub}>{sub}</li>)}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
          <div className="guias-media">
            <figure className={`guias-figure ${content.imagem_ajuste === "contain" ? "frente-figure-contain" : ""}`}>
              {imagemFalhou ? <div className="guias-placeholder"><ImageOff aria-hidden="true" className="h-6 w-6" />{content.imagem_placeholder}</div> : content.imagem_ampliavel ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="absolute inset-0 h-full w-full cursor-zoom-in p-0 hover:bg-transparent" aria-label="Ampliar imagem">{imagem}</Button>
                  </DialogTrigger>
                  <DialogContent className="outdoor-dialog" aria-describedby={undefined}>
                    <DialogTitle className="sr-only">{content.imagem_alt}</DialogTitle>
                    <img src={content.imagem_url} loading="eager" decoding="sync" alt={content.imagem_alt} className="outdoor-dialog-image" />
                  </DialogContent>
                </Dialog>
              ) : imagem}
            </figure>
            {content.indicadores_titulo && <p className="frente-indicadores-titulo">{content.indicadores_titulo}</p>}
            <ul className="guias-indicators comercial-indicators" style={{ "--indicadores": content.indicadores.length } as CSSProperties} aria-label={`Indicadores de ${content.titulo}`}>
              {content.indicadores.map((item, index) => <li key={item} className={`guias-indicator-${index + 1}`}>{item}</li>)}
            </ul>
            {content.mensagem && (
              <section className="frente-mensagem" aria-label={content.mensagem.titulo}>
                <h4>{content.mensagem.titulo}</h4>
                {content.mensagem.textos.map((t) => <p key={t}>{t}</p>)}
              </section>
            )}
          </div>
        </div>
        <section className="guias-result" aria-labelledby={destaqueId}>
          <h3 id={destaqueId}>{content.destaque_titulo}</h3>
          <div><p className="guias-result-main">{content.destaque_itens.join(" • ")}</p></div>
        </section>
        {content.nota && <p className="guias-observation">{content.nota}</p>}
      </div>
    </section>
  );
}
