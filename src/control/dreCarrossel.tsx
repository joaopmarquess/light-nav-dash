import { useEffect, useMemo, useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, Tooltip, XAxis, YAxis,
} from "recharts";
import { loadDreHostinger, type DreHRow } from "@/control/dreHostinger";

const ANO = 2026;
const MESES = [1, 2, 3, 4, 5, 6, 7, 8];
const NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"];
const C = ["hsl(var(--primary))", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#8b5cf6", "#eab308"];
const fmtC = (v: number) => {
  const a = Math.abs(v);
  return a >= 1e6 ? (v / 1e6).toFixed(1) + "M" : a >= 1e3 ? (v / 1e3).toFixed(0) + "k" : v.toFixed(0);
};
const fmtMi = (v: number) => `${(v / 1e6).toFixed(3)} milhões`;
const fmtEixo = (v: number) => `${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const tip = { formatter: (v: number) => brl(v) };

const ESCURO: Record<string, string> = { "#60a5fa": "#1e40af", "#e57373": "#b71c1c" };
const mkBarMin = (ka: string, kb: string, ligar = false) => { let prev: { x: number; y: number } | null = null; return (p: any) => {
  const { x, y, width, height, fill, value, payload } = p;
  const v = Number(Array.isArray(value) ? value[1] : value) || 0;
  const m = Math.min(payload[ka], payload[kb]);
  const r = Math.min(8, width / 2, height);
  const ly = v > 0 ? y + height - height * (m / v) : y + height;
  const ant = p.index === 0 ? null : prev;
  if (ligar && p.dataKey === kb) prev = { x: x + width + 8, y: ly };
  return (
    <g>
      <defs><clipPath id={`bm-${x}`}><path d={`M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`} /></clipPath></defs>
      <g clipPath={`url(#bm-${x})`}>
        <rect x={x} y={y} width={width} height={height} fill={fill} />
        {v > m + 0.005 && <rect x={x} y={y} width={width} height={Math.max(0, ly - y)} fill={ESCURO[fill] ?? fill} />}
      </g>
      {v > m + 0.005 && <line x1={x - 8} x2={x + width + 8} y1={ly} y2={ly} stroke="#facc15" strokeWidth={4} strokeLinecap="round" />}
      {v <= m + 0.005 && <line x1={x - 8} x2={x + width + 8} y1={y} y2={y} stroke="#facc15" strokeWidth={4} strokeLinecap="round" />}
      {ligar && p.dataKey === kb && ant && <line x1={ant.x} y1={ant.y} x2={x - width - 6 - 8} y2={ly} stroke="#facc15" strokeWidth={3} strokeLinecap="round" />}
    </g>
  );
}; };
const barMin = mkBarMin("Entradas Operacionais", "Despesas Assistenciais");

export function useDreCarrossel() {
  const [rows, setRows] = useState<DreHRow[] | null>(null);
  useEffect(() => { loadDreHostinger(ANO, MESES).then(setRows).catch(() => setRows([])); }, []);

  const charts = useMemo(() => {
    if (!rows) return [];
    // por mês: soma de cada G1; G1 positivo = receita, negativo = despesa
    const porMesG1 = new Map<string, number>();
    for (const r of rows) porMesG1.set(`${r.mes}|${r.g1}`, (porMesG1.get(`${r.mes}|${r.g1}`) ?? 0) + r.valor);
    let acum = 0;
    const mensal = MESES.map((m, i) => {
      let rec = 0, desp = 0;
      for (const [k, v] of porMesG1) if (k.startsWith(`${m}|`)) v >= 0 ? (rec += v) : (desp += -v);
      const res = rec - desp;
      acum += res;
      return { mes: NOMES[i], Receita: rec, Despesa: desp, Resultado: res, Acumulado: acum, Margem: rec ? (res / rec) * 100 : 0 };
    });
    const somaPor = (key: "g1" | "g3") => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r[key] || "(sem grupo)", (m.get(r[key] || "(sem grupo)") ?? 0) + r.valor);
      return [...m].filter(([, v]) => v < 0).map(([name, v]) => ({ name, value: -v })).sort((a, b) => b.value - a.value);
    };
    const limAcum = Math.max(1, ...mensal.map((x) => Math.abs(x.Acumulado))) * 1.1;
    const ac = mensal.map((x) => x.Acumulado);
    const mx = Math.max(...ac), mn = Math.min(...ac);
    const offAcum = mx <= 0 ? 0 : mn >= 0 ? 1 : mx / (mx - mn);
    const limRes = Math.max(1, ...mensal.map((x) => Math.abs(x.Resultado))) * 1.1;
    const rs = mensal.map((x) => x.Resultado);
    const rmx = Math.max(...rs), rmn = Math.min(...rs);
    const offRes = rmx <= 0 ? 0 : rmn >= 0 ? 1 : rmx / (rmx - rmn);
    const entDesp = MESES.map((m, i) => {
      let e = 0, d = 0;
      for (const r of rows) if (r.mes === m && !/FINANCEIRO/i.test(r.g1) && /PRINCIPAL/i.test(r.g3)) { if (/FATUR|COPART/i.test(r.g4)) e += r.valor; else d += r.valor; }
      return { mes: NOMES[i], "Entradas Operacionais": Math.abs(e), "Despesas Assistenciais": Math.abs(d) };
    });
    const totRD = MESES.map((m, i) => {
      let rc = 0, dp = 0;
      for (const r of rows) if (r.mes === m) {
        const ent = !/FINANCEIRO/i.test(r.g1) && /PRINCIPAL/i.test(r.g3) && /FATUR|COPART/i.test(r.g4);
        if (ent || /FINANCEIRO/i.test(r.g1)) rc += r.valor; else dp -= r.valor;
      }
      return { mes: NOMES[i], Receitas: rc, Despesas: dp };
    });
    const faixa = totRD.map((x) => ({ ...x, faixa: [Math.min(x.Receitas, x.Despesas), Math.max(x.Receitas, x.Despesas)], dif: x.Receitas - x.Despesas }));
    const fMin = Math.floor(Math.min(...faixa.map((x) => x.faixa[0])) / 2e6) * 2e6 - 2e6;
    const fMax = Math.ceil(Math.max(...faixa.map((x) => x.faixa[1])) / 2e6) * 2e6 + 2e6;
    const sinis = entDesp.map((x) => ({ mes: x.mes, Sinistralidade: x["Entradas Operacionais"] ? (x["Despesas Assistenciais"] / x["Entradas Operacionais"]) * 100 : 0 }));
    const sinMax = Math.ceil(Math.max(100, ...sinis.map((x) => x.Sinistralidade)) / 10) * 10 + 10;
    const sinMin = Math.max(0, Math.floor(Math.min(...sinis.map((x) => x.Sinistralidade)) / 10) * 10 - 10);
    const comp = somaPor("g1");
    const top = somaPor("g3").slice(0, 10);
    const sub = `DRE Controladoria · Jan–Ago/${ANO}`;
    return [
      { title: "Resultado acumulado", subtitle: sub, chart: (
        <ComposedChart data={mensal} margin={{ top: 24, right: 24, left: 8, bottom: 0 }}>
          <defs><linearGradient id="acumArea" x1="0" y1="0" x2="0" y2="1"><stop offset={offAcum} stopColor="#16a34a" stopOpacity={0.3} /><stop offset={offAcum} stopColor="#dc2626" stopOpacity={0.22} /></linearGradient><linearGradient id="acumSinal" x1="0" y1="0" x2="0" y2="1">
            <stop offset={offAcum} stopColor="#16a34a" /><stop offset={offAcum} stopColor="#dc2626" /></linearGradient></defs>
          <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tickMargin={10} /><YAxis axisLine={false} tickLine={false} width={70} tickFormatter={fmtEixo} domain={[-limAcum, limAcum]} ticks={[-limAcum, -limAcum / 2, 0, limAcum / 2, limAcum]} allowDataOverflow interval={0} /><Tooltip {...tip} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "4 4" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 24px -8px hsl(var(--foreground) / 0.2)" }} /><Legend />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 4" ifOverflow="extendDomain" />
          <Area type="monotone" dataKey="Acumulado" baseValue={0} fill="url(#acumArea)" stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />
          <Line type="monotone" dataKey="Acumulado" stroke="url(#acumSinal)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" dot={(p: any) => <circle key={p.index} cx={p.cx} cy={p.cy} r={6} strokeWidth={3} stroke="hsl(var(--card))" fill={p.value < 0 ? "#dc2626" : "#16a34a"} />}><LabelList dataKey="Acumulado" content={(p: any) => <text x={p.x} y={p.y - 14} textAnchor={p.index === mensal.length - 1 ? "end" : p.index === 0 ? "start" : "middle"} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">{fmtMi(Number(p.value))}</text>} /></Line></ComposedChart>) },
      { title: "Resultado do mês", subtitle: sub, chart: (
        <ComposedChart data={mensal} margin={{ top: 24, right: 24, left: 8, bottom: 0 }}>
          <defs><linearGradient id="resArea" x1="0" y1="0" x2="0" y2="1"><stop offset={offRes} stopColor="#2563eb" stopOpacity={0.3} /><stop offset={offRes} stopColor="#dc2626" stopOpacity={0.22} /></linearGradient><linearGradient id="resSinal" x1="0" y1="0" x2="0" y2="1">
            <stop offset={offRes} stopColor="#2563eb" /><stop offset={offRes} stopColor="#dc2626" /></linearGradient></defs>
          <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tickMargin={10} /><YAxis axisLine={false} tickLine={false} width={70} tickFormatter={fmtEixo} domain={[-limRes, limRes]} ticks={[-limRes, -limRes / 2, 0, limRes / 2, limRes]} allowDataOverflow interval={0} /><Tooltip {...tip} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "4 4" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 24px -8px hsl(var(--foreground) / 0.2)" }} /><Legend />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="6 4" ifOverflow="extendDomain" />
          <Area type="monotone" dataKey="Resultado" baseValue={0} fill="url(#resArea)" stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />
          <Line type="monotone" dataKey="Resultado" stroke="url(#resSinal)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" dot={(p: any) => <circle key={p.index} cx={p.cx} cy={p.cy} r={6} strokeWidth={3} stroke="hsl(var(--card))" fill={p.value < 0 ? "#dc2626" : "#2563eb"} />}><LabelList dataKey="Resultado" content={(p: any) => <text x={p.x} y={p.y - 14} textAnchor={p.index === mensal.length - 1 ? "end" : p.index === 0 ? "start" : "middle"} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">{fmtMi(Number(p.value))}</text>} /></Line></ComposedChart>) },
      { title: "Entradas Operacionais x Despesas Assistenciais", subtitle: `${sub} · valores absolutos`, chart: (
        <BarChart data={entDesp} barGap={6} barCategoryGap="22%" margin={{ top: 40, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tickMargin={10} /><YAxis axisLine={false} tickLine={false} width={70} tickFormatter={fmtEixo} domain={[0, (max: number) => max * 1.25]} />
          <Tooltip {...tip} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 24px -8px hsl(var(--foreground) / 0.2)" }} /><Legend iconType="circle" />
          <Bar dataKey="Entradas Operacionais" fill="#60a5fa" shape={barMin}><LabelList dataKey="Entradas Operacionais" content={(p: any) => {
            const d = entDesp[p.index]; if (!d) return null;
            const e = d["Entradas Operacionais"], dp = d["Despesas Assistenciais"], v = Number(p.value) || 0;
            const top = v > 0 ? p.y + p.height - p.height * (Math.max(e, dp) / v) : p.y;
            const dif = e - dp;
            return <text x={p.x + p.width + 3} y={90} textAnchor="middle" fontSize={12} fontWeight={700} fill={dif < 0 ? "#b71c1c" : "#1e40af"}>{fmtMi(dif)}</text>;
          }} /><LabelList dataKey="Entradas Operacionais" content={(p: any) => { const cx = p.x + p.width / 2, cy = p.y + 12; return <text x={cx} y={cy} transform={`rotate(-90 ${cx} ${cy})`} textAnchor="end" dominantBaseline="central" fontSize={12} fontWeight={600} fill="#ffffff">{fmtMi(Number(p.value))}</text>; }} /></Bar>
          <Bar dataKey="Despesas Assistenciais" fill="#e57373" shape={barMin}><LabelList dataKey="Despesas Assistenciais" content={(p: any) => { const cx = p.x + p.width / 2, cy = p.y + 12; return <text x={cx} y={cy} transform={`rotate(-90 ${cx} ${cy})`} textAnchor="end" dominantBaseline="central" fontSize={12} fontWeight={600} fill="#ffffff">{fmtMi(Number(p.value))}</text>; }} /></Bar>
        </BarChart>) },
      { title: "Receitas x Despesas · distância do mês", subtitle: `${sub} · cápsula azul = sobra, vermelha = falta`, chart: (
        <ComposedChart data={faixa} margin={{ top: 40, right: 24, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="capPos" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e40af" /><stop offset="100%" stopColor="#60a5fa" /></linearGradient>
            <linearGradient id="capNeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b71c1c" /><stop offset="100%" stopColor="#e57373" /></linearGradient>
            <filter id="capSh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.18" /></filter>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tickMargin={10} />
          <YAxis axisLine={false} tickLine={false} width={70} domain={[fMin, fMax]} tickFormatter={fmtEixo} />
          <Tooltip formatter={(v: any, n: string) => (Array.isArray(v) ? [brl(v[1] - v[0]), "Distância"] : [brl(Number(v)), n])} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 24px -8px hsl(var(--foreground) / 0.2)" }} />
          <Legend payload={[{ value: "Receitas", type: "circle", color: "#2563eb" }, { value: "Despesas", type: "circle", color: "#dc2626" }] as any} />
          <Line type="monotone" dataKey="Receitas" stroke="#2563eb" strokeOpacity={0.25} strokeWidth={2} strokeDasharray="2 6" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false} />
          <Line type="monotone" dataKey="Despesas" stroke="#dc2626" strokeOpacity={0.25} strokeWidth={2} strokeDasharray="2 6" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false} />
          <Bar dataKey="faixa" barSize={34} isAnimationActive={false} shape={(p: any) => {
            const d = faixa[p.index]; const pos = d.dif >= 0; const w = p.width, h = Math.max(p.height, 4);
            return (
              <g filter="url(#capSh)">
                <rect x={p.x} y={p.y - w / 2} width={w} height={h + w} rx={w / 2} fill={pos ? "url(#capPos)" : "url(#capNeg)"} opacity={0.9} />
                <circle cx={p.x + w / 2} cy={pos ? p.y : p.y + h} r={7} fill="#ffffff" stroke="#2563eb" strokeWidth={3} />
                <circle cx={p.x + w / 2} cy={pos ? p.y + h : p.y} r={7} fill="#ffffff" stroke="#dc2626" strokeWidth={3} />
                <rect x={p.x + w / 2 - 52} y={p.y - w / 2 - 34} width={104} height={24} rx={12} fill={pos ? "#dbeafe" : "#fee2e2"} />
                <text x={p.x + w / 2} y={p.y - w / 2 - 22} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={pos ? "#1e40af" : "#b71c1c"}>{`${pos ? "+" : "−"}${fmtEixo(Math.abs(d.dif))}`}</text>
              </g>
            );
          }} />
        </ComposedChart>) },
      { title: "Evolução da sinistralidade", subtitle: `${sub} · despesas assistenciais ÷ entradas operacionais`, chart: (
        <ComposedChart data={sinis} margin={{ top: 24, right: 24, left: 8, bottom: 0 }}>
          <defs><linearGradient id="sinArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.35} /><stop offset="100%" stopColor="#f97316" stopOpacity={0.02} /></linearGradient></defs>
          <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" axisLine={false} tickLine={false} tickMargin={10} /><YAxis axisLine={false} tickLine={false} width={60} domain={[sinMin, sinMax]} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip formatter={(v: number) => `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "4 4" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", boxShadow: "0 8px 24px -8px hsl(var(--foreground) / 0.2)" }} /><Legend />
          <ReferenceLine y={100} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6 4" label={{ value: "100%", position: "insideTopRight", fill: "#dc2626", fontSize: 11 }} />
          <Area type="monotone" dataKey="Sinistralidade" fill="url(#sinArea)" stroke="none" legendType="none" tooltipType="none" isAnimationActive={false} />
          <Line type="monotone" dataKey="Sinistralidade" stroke="#f97316" strokeWidth={4} strokeLinecap="round" dot={{ r: 6, strokeWidth: 3, stroke: "hsl(var(--card))", fill: "#f97316" }}>
            <LabelList dataKey="Sinistralidade" content={(p: any) => <text x={p.x} y={p.y - 14} textAnchor={p.index === sinis.length - 1 ? "end" : p.index === 0 ? "start" : "middle"} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">{((v: number) => `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`)(Number(p.value))}</text>} />
          </Line>
        </ComposedChart>) },
    ];
  }, [rows]);

  return { charts, loading: rows === null };
}
