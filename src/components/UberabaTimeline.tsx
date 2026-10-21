import { useState } from "react";

type Etapa = { nome: string; filhos?: string[]; texto?: string };

const ESTUDO = `O estudo para o **Projeto Uberaba** partiu de uma **leitura ampla do mercado** e da convicção de que a entrada da Bensaúde na cidade não poderia ser tratada apenas como uma **expansão comercial**. Buscamos compreender o território, sua dinâmica empresarial, sua influência regional e, sobretudo, sua reconhecida **vocação para a saúde e para a medicina**. A partir dessa visão, o projeto passou a ser construído para integrar **presença institucional**, **capacidade assistencial** e **desenvolvimento de mercado**.

A **estrutura assistencial** recebeu atenção especial. Avaliamos a necessidade de uma **referência hospitalar**, a composição de uma **rede médica por especialidade** e a disponibilidade de **serviços de diagnóstico e terapia**. Comparamos redes já existentes em Uberaba e utilizamos também a experiência da própria Bensaúde em **São José do Rio Preto** como parâmetro para dimensionamento. O objetivo não foi simplesmente reproduzir uma rede, mas entender que estrutura seria necessária para sustentar uma **operação competitiva e confiável**.

Na frente comercial, o estudo evoluiu para **três modelos distintos de atuação**: **PCA/ACIU**, direcionado ao mercado de adesão; **PCE 50 a 99**, voltado às médias empresas; e **PCE 100+**, destinado às empresas de maior porte. Para cada frente analisamos públicos, volumes potenciais, tabelas, formas de participação e possíveis composições entre **Operadora, Administradora, Corretora e equipe própria**. Essa segmentação mostrou que Uberaba não deve ser abordada com uma única estratégia comercial, mas com propostas adequadas às características de cada mercado.

Também estudamos quem poderia caminhar conosco na implantação. O relacionamento com o **Hospital Mário Palmério**, a participação da **SIGA Soluções** e as alternativas envolvendo a **Lancers** foram incorporados ao desenho como possibilidades de construir presença local com parceiros já inseridos no ambiente da cidade. Mais do que contratar fornecedores, a proposta é estabelecer conexões que aproximem a Bensaúde da comunidade médica, das empresas, das entidades e dos demais agentes que formam o **ecossistema de saúde de Uberaba**.

Por fim, o projeto passou a considerar não apenas como vender em Uberaba, mas **como chegar a Uberaba**. A Bensaúde ainda não possui na cidade o reconhecimento que construiu nos mercados onde atua, e isso exige uma **estratégia própria de apresentação**. A mensagem pretendida parte de uma posição transparente: **estamos chegando, acreditamos em Uberaba**, reconhecemos sua história, sua força econômica e sua vocação para a saúde, e queremos investir na cidade conectando empresas, profissionais, prestadores e pessoas. É essa combinação entre estudo de mercado, rede assistencial, estratégia comercial, parcerias e **construção de marca** que dá sentido ao **modelo de atuação proposto**.`;

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const ETAPAS: Etapa[] = [
  { nome: "Estudo", texto: ESTUDO },
  { nome: "Hospital Mário Palmério", texto: LOREM },
  { nome: "Modelo de Atuação", filhos: ["Operação Comercial", "Rede Assistencial"] },
  { nome: "Plano de Marketing", texto: LOREM },
  { nome: "Formalização", texto: LOREM },
  { nome: "Implantação", texto: LOREM },
];

const UberabaTimeline = () => {
  const [aberta, setAberta] = useState<string | null>(null);
  const atual = ETAPAS.find((e) => e.nome === aberta);

  return (
    <div className="flex h-full flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">Timeline</h1>
      <div className="rounded-lg border border-border bg-card px-8 py-12">
        <div className="relative">
          <div className="absolute left-[8.33%] right-[8.33%] top-5 h-0.5 bg-border" />
          <ol className="relative grid grid-cols-6 gap-4">
            {ETAPAS.map((e, i) => {
              const on = aberta === e.nome;
              const clicavel = !!e.filhos || !!e.texto;
              return (
                <li key={e.nome} className="flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    disabled={!clicavel}
                    onClick={() => setAberta(on ? null : e.nome)}
                    className={`flex flex-col items-center gap-3 ${clicavel ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-sm font-semibold ${
                        on ? "bg-primary text-primary-foreground" : "bg-background text-primary"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-sm font-medium text-foreground ${clicavel ? "underline decoration-dotted underline-offset-4" : ""}`}>
                      {e.nome}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {(atual?.filhos || atual?.texto) && (
        <div className="-my-6 grid grid-cols-6 gap-4 px-8">
          <div
            className="flex justify-center"
            style={{ gridColumnStart: ETAPAS.indexOf(atual) + 1 }}
          >
            <div className="h-6 w-0.5 bg-primary" />
          </div>
        </div>
      )}

      {(atual?.filhos || atual?.texto) && (
        <div className="min-h-0 w-full flex-1 overflow-auto rounded-lg border border-border bg-card px-12 py-8">
          <p className="mb-6 text-xl font-semibold text-foreground">{atual.nome}</p>
          {atual.texto && <p className="whitespace-pre-line text-justify text-xl leading-9 text-foreground/85 hyphens-auto" lang="pt-BR">{atual.texto.split("**").map((t, i) => (i % 2 ? <strong key={i} className="font-semibold text-foreground">{t}</strong> : t))}</p>}
          {atual.filhos && <div className="flex w-full gap-4">
            {atual.filhos.map((f) => (
              <div key={f} className="flex-1 rounded-md border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
                {f}
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
};

export default UberabaTimeline;
