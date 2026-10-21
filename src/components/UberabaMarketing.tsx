import { useState } from "react";
import { ImageIcon } from "lucide-react";
import campanha from "@/assets/uberaba-marketing-v3-campanha.asset.json";

const PREMISSAS = [
  { titulo: "Somos novos", texto: "Apresentar a chegada com transparência.", cor: "arrival" },
  { titulo: "Temos credibilidade", texto: "Demonstrar experiência e capacidade.", cor: "trust" },
  { titulo: "Acreditamos em Uberaba", texto: "Valorizar a cidade, seus valores e potencial.", cor: "potential" },
  { titulo: "Vocação para a saúde", texto: "Reconhecer a força da medicina local.", cor: "health" },
  { titulo: "Parceiros locais", texto: "Hospital Mário Palmério e SIGA Soluções.", cor: "partners" },
  { titulo: "Investimento e conexão", texto: "Aproximar empresas, médicos e prestadores.", cor: "arrival" },
];

export default function UberabaMarketing() {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="uberaba-marketing" aria-label="Plano de Marketing de Uberaba">
      <div className="marketing-page">
        <header className="marketing-header">
          <p>PROJETO UBERABA | PLANO DE MARKETING</p>
          <h2>Estamos chegando.</h2>
          <p className="marketing-subtitle">Posicionamento e publicidade inicial na cidade</p>
        </header>
        <div className="marketing-body">
          <section className="marketing-message" aria-label="A mensagem">
            <h3>O Bensaúde chega a Uberaba porque acredita na cidade, reconhece sua força econômica e sua vocação para a saúde.</h3>
            <p>Trazemos a credibilidade construída onde já atuamos e queremos investir em uma relação duradoura com empresas, profissionais de saúde, prestadores e a comunidade.</p>
            <strong className="marketing-motto">Chegar • Conectar • Crescer</strong>
            {imageFailed ? <div className="marketing-image-placeholder"><ImageIcon aria-hidden="true" />Imagem a inserir</div> : <img src={campanha.url} alt="Campanha Bensaúde: Estamos chegando, Uberaba!" onError={() => setImageFailed(true)} />}
          </section>
          <div className="marketing-strategy">
            <section className="marketing-premises" aria-labelledby="marketing-premises-title">
              <h3 id="marketing-premises-title">Premissas da narrativa</h3>
              <ol>
                {PREMISSAS.map((p, i) => <li key={p.titulo}><span className={`marketing-number marketing-tone-${p.cor}`}>{i + 1}</span><div><h4>{p.titulo}</h4><p>{p.texto}</p></div></li>)}
              </ol>
            </section>
            <section className="marketing-channels" aria-labelledby="marketing-channels-title">
              <h3 id="marketing-channels-title">Onde divulgar</h3>
              <div className="marketing-channel-grid">
                <div className="marketing-channel marketing-offline"><h4>OFF-LINE</h4><p>TV • Outdoor • Painéis • Rádio • Imprensa local</p></div>
                <div className="marketing-channel marketing-online"><h4>ON-LINE</h4><p>Instagram • Facebook • LinkedIn • Influenciadores locais</p></div>
              </div>
            </section>
          </div>
        </div>
        <footer className="marketing-footer"><p>Diretriz: comunicação institucional primeiro; produtos, preços e rede somente após validação e autorização formal.</p><strong>Bensaúde</strong></footer>
      </div>
    </article>
  );
}