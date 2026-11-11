import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { COMERCIAL_UBERABA, type ModeloComercialContent } from "@/lib/uberabaFrentes";

// Comercial do Modelo de Atuação: mesma composição e identidade visual da tela Guias.
export default function UberabaModeloComercial({ content = COMERCIAL_UBERABA }: { content?: ModeloComercialContent }) {
  const [imagemFalhou, setImagemFalhou] = useState(false);
  useEffect(() => setImagemFalhou(false), [content.imagem_url]);

  return (
    <section className="uberaba-guias modelo-comercial" aria-labelledby="modelo-comercial-titulo">
      <div className="guias-page">
        <header className="guias-header">
          <div>
            <p>Bensaúde|Uberaba</p>
            <h3 id="modelo-comercial-titulo">{content.titulo}</h3>
            <p className="guias-subtitle">{content.subtitulo}</p>
          </div>
        </header>
        <div className="guias-body">
          <div className="comercial-grupos">
            {content.grupos.map((grupo) => (
              <section key={grupo.id} className="comercial-grupo" aria-labelledby={`comercial-${grupo.id}`}>
                <h4 id={`comercial-${grupo.id}`} className="comercial-grupo-titulo">{grupo.titulo}</h4>
                <ol className="guias-stages">
                  {grupo.itens.map((item) => (
                    <li key={item.id} className={`guias-stage guias-tone-${item.cor}`}>
                      <span className="guias-number">{item.numero}</span>
                      <div className="min-w-0">
                        <h3>{item.titulo}</h3>
                        {item.subitens && (
                          <ul className="comercial-subitens" aria-label={`Integram ${item.titulo}`}>
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
            <figure className="guias-figure">
              {imagemFalhou ? <div className="guias-placeholder"><ImageOff aria-hidden="true" className="h-6 w-6" />Imagem da atividade comercial</div> : <img src={content.imagem_url} onError={() => setImagemFalhou(true)} loading="eager" decoding="sync" width={1536} height={1024} alt={content.imagem_alt} />}
            </figure>
            <ul className="guias-indicators comercial-indicators" aria-label="Indicadores do modelo comercial">
              {content.indicadores.map((item, index) => <li key={item} className={`guias-indicator-${index + 1}`}>{item}</li>)}
            </ul>
          </div>
        </div>
        <section className="guias-result" aria-labelledby="modelo-comercial-destaque">
          <h3 id="modelo-comercial-destaque">{content.destaque_titulo}</h3>
          <div><p className="guias-result-main">{content.destaque_itens.join(" • ")}</p></div>
        </section>
      </div>
    </section>
  );
}
