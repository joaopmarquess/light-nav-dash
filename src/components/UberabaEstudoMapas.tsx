import { useState } from "react";
import { createPortal } from "react-dom";
import UberabaMapa from "@/components/UberabaMapa";
import UberabaShell, { type PainelExtraTab } from "@/components/UberabaShell";
import UberabaDados from "@/components/UberabaDados";
import UberabaEstudoSimulacoes from "@/components/UberabaEstudoSimulacoes";
import { Button } from "@/components/ui/button";
import { Calculator, Database, House, LayoutDashboard, MapPinned } from "lucide-react";
import { geographicToday } from "@/hooks/useCarteiraTrialGeo";

import { UBERABA_ESTUDO } from "@/lib/uberabaEstudo";
import estudoImagem from "@/assets/projeto-uberaba-home-v2.svg.asset.json";

const ROTULOS = { home: "Home do Estudo", painel: "Painel", uberaba: "Área", simulacoes: "Simulações" } as const;
export type Visao = keyof typeof ROTULOS;

// Dados entra como aba do Painel somente no Estudo; o Painel autônomo continua igual.
const PAINEL_EXTRAS: PainelExtraTab[] = [
  { id: "dados", label: "Dados", icon: Database, title: "Fonte: Antônio Justo e César Martins (Lancers)", content: <UberabaDados /> },
];

// navTarget: quando informado (Timeline), os botões do Estudo ficam no mesmo quadro de "Etapa".
// visaoInicial: visão aberta ao entrar (atalho da Home abre direto em Simulações).
const UberabaEstudoMapas = ({ navTarget, visaoInicial = "home" }: { navTarget?: HTMLElement | null; visaoInicial?: Visao } = {}) => {
  const [selected, setSelected] = useState<Visao>(visaoInicial);
  const [date] = useState(geographicToday);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const [subNav, setSubNav] = useState<HTMLDivElement | null>(null);
  // Home e Simulações mantêm a altura do conteúdo, para a assinatura do painel ficar no fim da página e não sobre o texto.
  const encolhe = selected === "simulacoes" || selected === "home";
  const botao = (id: Visao, Icone: typeof House, nome: string) => (
    <Button variant={selected === id ? "default" : "outline"} aria-pressed={selected === id} onClick={() => setSelected(id)}><Icone />{nome}</Button>
  );
  // Os sub-botões (3º nível) de Painel e Simulações ficam na mesma linha destes botões (2º nível).
  const nav = (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Visões do Estudo">
        {botao("home", House, "Home")}
        {botao("painel", LayoutDashboard, "Painel")}
        {botao("uberaba", MapPinned, "Área")}
        {botao("simulacoes", Calculator, "Simulações")}
      </div>
      <div ref={setSubNav} className="flex min-w-0 flex-1 items-center empty:hidden" />
    </>
  );
  return (
    <div className={`flex min-h-[400px] min-w-0 flex-col gap-3 ${encolhe ? "shrink-0" : "flex-1"}`}>
      <div className={navTarget === undefined ? "flex shrink-0 flex-wrap items-center gap-4" : "contents"} aria-label="Cabeçalho de Estudo">
      {navTarget === undefined && nav}
      <div ref={setToolbar} className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3 empty:hidden" />
      </div>
      {navTarget && createPortal(nav, navTarget)}
      <section aria-label={ROTULOS[selected]} className={`flex min-h-0 min-w-0 flex-col ${encolhe ? "shrink-0" : "flex-1"}`}>
        {selected === "home" && <article lang="pt-BR" className="space-y-5 text-justify text-xl leading-7 text-foreground/85 hyphens-auto">
          <img src={estudoImagem.url} loading="eager" decoding="sync" alt="Outdoor do Bensaúde com Hospital Mário Palmério e SIGA: Estamos chegando, Uberaba" className="max-h-[60vh] w-full object-contain" />
          {UBERABA_ESTUDO.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph.split("**").map((text, part) => part % 2 ? <strong key={part} className="font-semibold text-foreground">{text}</strong> : text)}</p>)}
        </article>}
        {selected === "painel" && <UberabaShell embedded extraTabs={PAINEL_EXTRAS} subNavTarget={subNav} />}
        {selected === "uberaba" && <UberabaMapa embedded selectedDate={date} toolbarTarget={toolbar} />}
        {selected === "simulacoes" && <UberabaEstudoSimulacoes subNavTarget={subNav} />}
      </section>
    </div>
  );
};

export default UberabaEstudoMapas;
