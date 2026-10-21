import type { ReactNode } from "react";
import { ArrowRight, FileText, ImageIcon, MapIcon } from "lucide-react";

const P = ({ children }: { children: ReactNode }) => (
  <p className="text-justify text-xl leading-7 text-foreground/85 hyphens-auto" lang="pt-BR">{children}</p>
);
const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>;
const Sub = ({ children }: { children: ReactNode }) => (
  <p className="-mt-4 mb-6 text-lg text-muted-foreground">{children}</p>
);
const H = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-primary">{children}</h3>
);
const Pendente = ({ icon: Icon, children }: { icon: typeof FileText; children: ReactNode }) => (
  <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 px-5 py-6 text-base text-muted-foreground">
    <Icon className="h-5 w-5 shrink-0" />
    <span>{children}</span>
  </div>
);
const Lista = ({ itens, cols = 2 }: { itens: string[]; cols?: number }) => (
  <ul className={`grid gap-x-8 gap-y-2 text-lg text-foreground/85 ${cols === 4 ? "md:grid-cols-4" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
    {itens.map((i) => (
      <li key={i} className="flex items-start gap-2">
        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        {i}
      </li>
    ))}
  </ul>
);
const Fluxo = ({ itens, numerado }: { itens: string[]; numerado?: boolean }) => (
  <div className="flex flex-wrap items-center gap-2 text-base">
    {itens.map((i, n) => (
      <div key={i} className="flex items-center gap-2">
        <span className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground">
          {numerado && <span className="mr-2 font-semibold text-primary">{n + 1}</span>}
          {i}
        </span>
        {n < itens.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    ))}
  </div>
);
const Colunas = ({ itens }: { itens: { t: string; d: string }[] }) => (
  <div className={`grid gap-6 border-y border-border py-5 ${itens.length > 3 ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
    {itens.map((i) => (
      <div key={i.t}>
        <p className="mb-1 text-base font-semibold text-foreground">{i.t}</p>
        <p className="text-base leading-6 text-muted-foreground">{i.d}</p>
      </div>
    ))}
  </div>
);

export const HOSPITAL = (
  <div className="space-y-4">
    <Sub>Referência hospitalar para a estruturação da operação em Uberaba</Sub>
    <P>A construção do modelo de atuação em Uberaba passa pela definição de uma <B>referência hospitalar</B> capaz de dar <B>sustentação assistencial</B> e <B>credibilidade</B> à entrada do Bensaúde na cidade. O <B>Hospital Mário Palmério</B> foi incorporado ao estudo como <B>parceiro prioritário</B> nessa estruturação.</P>
    <P>A relação com o hospital deve ser apresentada como parte de uma estratégia mais ampla de implantação da rede. A presença hospitalar funciona como ponto de partida para a construção de uma <B>rede complementar</B> formada por médicos, clínicas, laboratórios e serviços de diagnóstico e terapia.</P>
    <P>O objetivo não é apenas adicionar um prestador à rede, mas estabelecer uma <B>referência assistencial local</B> que dialogue com o posicionamento pretendido para o Bensaúde em Uberaba e com o desenvolvimento futuro dos produtos comerciais.</P>
    <div className="pt-4">
      <Colunas itens={[
        { t: "Papel no projeto", d: "Referência hospitalar prioritária" },
        { t: "Integração pretendida", d: "Rede hospitalar + rede médica + diagnóstico e terapia" },
        { t: "Status", d: "Em estruturação / formalização" },
      ]} />
    </div>
    <H>Pontos para formalização</H>
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-5 py-4">
      <Lista cols={3} itens={["Escopo assistencial", "Condições comerciais", "Fluxos operacionais", "Integração com a rede complementar", "Comunicação institucional do parceiro"]} />
    </div>
  </div>
);

export const MODELO = (
  <div className="space-y-4">
    <Sub>Estratégia de implantação, operação e desenvolvimento comercial e assistencial</Sub>
    <P>O Modelo de Atuação organiza a entrada do Bensaúde em Uberaba de forma integrada. A proposta combina <B>rede assistencial</B>, <B>estratégia comercial</B>, <B>parceiros locais</B>, <B>posicionamento institucional</B> e <B>desenvolvimento de mercado</B>.</P>
    <P>Na dimensão comercial, o estudo foi organizado em <B>três frentes distintas</B>:</P>
    <Colunas itens={[
      { t: "PCA / ACIU", d: "Mercado de adesão, direcionado aos públicos elegíveis vinculados à ACIU e demais entidades aplicáveis." },
      { t: "PCE 50 a 99", d: "Contratação empresarial direcionada às médias empresas." },
      { t: "PCE 100+", d: "Contratação empresarial direcionada às empresas de maior porte." },
    ]} />
    <H>Território de atuação</H>
    <P>A área inicial concentra-se em <B>Uberaba</B> e nos <B>municípios do entorno</B> definidos pelo projeto. O desenvolvimento regional deverá acompanhar a disponibilidade da rede assistencial, a viabilidade comercial e a evolução da operação.</P>
    <Pendente icon={MapIcon}>Espaço reservado para o mapa do projeto.</Pendente>
    <H>Pilares do Modelo</H>
    <Lista cols={4} itens={["Rede assistencial", "Desenvolvimento comercial", "Parcerias locais", "Gestão e sustentabilidade"]} />
  </div>
);

export const MARKETING = (
  <div className="space-y-4">
    <Sub>Estratégia de posicionamento e publicidade inicial na cidade</Sub>
    <p className="border-l-4 border-primary py-1 pl-5 text-3xl font-semibold text-foreground">Estamos chegando.</p>
    <P>O Bensaúde chega a Uberaba ainda sem o mesmo <B>reconhecimento de marca</B> construído nos mercados onde já atua. Por isso, a primeira etapa da comunicação deve ser <B>institucional</B>: apresentar quem somos, demonstrar nossa <B>credibilidade</B> e explicar por que escolhemos Uberaba.</P>
    <P>Nossa mensagem parte da convicção de que Uberaba possui valores, potencial econômico e uma relevante <B>vocação para a saúde e para a medicina</B>. Queremos apresentar o Bensaúde como uma organização que acredita nesse potencial e pretende construir uma <B>presença de longo prazo</B> na cidade.</P>
    <P>A comunicação também deverá demonstrar que <B>não chegamos sozinhos</B>. O projeto considera <B>parceiros locais</B> inseridos no ecossistema de Uberaba e pretende aproximar empresas, profissionais de saúde, prestadores e futuros beneficiários.</P>
    <H>A mensagem</H>
    <ol className="grid gap-x-8 gap-y-3 text-lg text-foreground/85 md:grid-cols-2">
      {[
        "Somos novos em Uberaba e precisamos nos apresentar.",
        "Temos credibilidade nos mercados onde já atuamos.",
        "Acreditamos em Uberaba, em seus valores e em seu potencial.",
        "Reconhecemos a vocação da cidade para a saúde e para a medicina.",
        "Estamos construindo o projeto com parceiros locais de credibilidade.",
        "Queremos investir na cidade e aproximar empresas, médicos, prestadores e pessoas.",
      ].map((m, i) => (
        <li key={m} className="flex gap-3">
          <span className="font-semibold text-primary">{i + 1}.</span>
          {m}
        </li>
      ))}
    </ol>
    <H>Publicidade inicial</H>
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="mb-2 text-base font-semibold text-foreground">Off-line</p>
        <Lista cols={1} itens={["TV", "Outdoor", "Painéis", "Rádio", "Imprensa e mídia local"]} />
      </div>
      <div>
        <p className="mb-2 text-base font-semibold text-foreground">On-line</p>
        <Lista cols={1} itens={["Instagram", "Facebook", "LinkedIn", "Impulsionamento geolocalizado", "Influenciadores locais", "Canais próprios do Bensaúde"]} />
      </div>
    </div>
    <div className="pt-4">
      <Pendente icon={ImageIcon}>Espaço reservado para imagens conceituais de campanha.</Pendente>
    </div>
  </div>
);

export const FORMALIZACAO = (
  <div className="space-y-4">
    <Sub>Transformando o modelo estudado em relações operacionais e comerciais</Sub>
    <P>Após a definição das premissas do projeto, cada relação necessária à implantação deverá ser traduzida em <B>instrumentos formais</B>.</P>
    <P>A formalização deverá estabelecer claramente o <B>papel de cada participante</B>, seus <B>direitos e responsabilidades</B>, <B>condições comerciais</B>, <B>regras de remuneração</B>, <B>requisitos operacionais</B> e <B>critérios de acompanhamento</B>.</P>
    <H>Frentes de formalização</H>
    <Lista cols={4} itens={["Rede hospitalar", "Rede médica", "Serviços de diagnóstico e terapia", "Corretagem", "Administração", "Entidades", "Produtos empresariais", "Marketing e uso de marcas"]} />
    <H>Fluxo</H>
    <Fluxo itens={["Estudo", "Negociação", "Definição das condições", "Aprovação", "Formalização", "Implantação"]} />
    <H>Documentos e instrumentos</H>
    <Pendente icon={FileText}>
      <B>Em definição.</B> Esta área deverá concentrar posteriormente protocolos de intenções, contratos, propostas, anexos comerciais e demais documentos relacionados ao Bensaúde Uberba.
    </Pendente>
  </div>
);

export const IMPLANTACAO = (
  <div className="space-y-4">
    <Sub>Da estratégia à operação em Uberaba</Sub>
    <P>A implantação representa a <B>convergência das etapas anteriores</B>. O início da operação depende da compatibilidade entre <B>rede assistencial</B>, <B>produtos</B>, <B>contratos</B>, <B>sistemas</B>, <B>canais comerciais</B> e <B>comunicação</B>.</P>
    <P>A entrada no mercado deve ocorrer de maneira <B>coordenada</B> para que a promessa comercial apresentada às empresas e aos beneficiários corresponda efetivamente à <B>capacidade operacional e assistencial</B> disponível.</P>
    <H>Sequência de implantação</H>
    <Fluxo numerado itens={["Rede mínima validada", "Contratos formalizados", "Produtos configurados", "Processos e sistemas preparados", "Equipes e parceiros capacitados", "Comunicação de lançamento", "Início das vendas", "Acompanhamento da operação"]} />
    <H>Monitoramento</H>
    <Colunas itens={[
      { t: "Comercial", d: "Vidas, propostas, conversão e vendas por frente." },
      { t: "Assistencial", d: "Rede ativa, especialidades, serviços e disponibilidade." },
      { t: "Financeiro", d: "Faturamento, custos, resultado e sinistralidade." },
      { t: "Operação", d: "Pendências, implantação, atendimento e integrações." },
      { t: "Marketing", d: "Alcance, geração de oportunidades e desempenho das campanhas." },
    ]} />
    <blockquote className="mt-8 border-l-4 border-primary bg-muted/30 px-6 py-5 text-xl italic leading-8 text-foreground">
      “Uberaba não é apenas uma nova praça comercial. O projeto foi concebido para construir uma operação que conecte capacidade assistencial, desenvolvimento empresarial, profissionais de saúde e presença regional do Bensaúde.”
    </blockquote>
  </div>
);
