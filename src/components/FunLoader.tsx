import { useEffect, useState } from "react";

const MESSAGES = [
  "Convocando as vidas seguradas...",
  "Somando sinistros com carinho...",
  "Perseguindo copart. fujona...",
  "Contando internações nos dedos...",
  "Negociando com a planilha...",
  "Alinhando decimais teimosos...",
  "Empilhando terapias e exames...",
  "Passando pano no vrdespesas...",
  "Cochichando com o Postgres...",
  "Espiando a materialized view...",
  "Domando o SALDO instável...",
  "Fazendo as vidas darem tchau...",
];

const FunLoader = ({ label }: { label?: string }) => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MESSAGES.length));

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const text = label ?? MESSAGES[idx];

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="flex items-end gap-1.5 h-6">
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" />
      </div>
      <div key={idx} className="text-sm animate-fade-in">{text}</div>
    </div>
  );
};

export default FunLoader;
