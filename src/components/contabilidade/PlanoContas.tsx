import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ContabRow, fmtBR } from "./types";

type Node = {
  key: string;
  code: string;
  label: string;
  level: number;
  realizado: number;
  saldo_final: number;
  children: Map<string, Node>;
  leafCount: number;
};

const LEVELS: (keyof ContabRow)[] = ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9"];

function splitNode(v: string | null | undefined): { code: string; label: string } | null {
  if (!v || v === "0" || v === "-") return null;
  const i = v.indexOf("|");
  if (i < 0) return { code: v, label: v };
  return { code: v.slice(0, i), label: v.slice(i + 1) };
}

function buildTree(rows: ContabRow[]): Node {
  const root: Node = { key: "root", code: "", label: "Plano de Contas", level: -1, realizado: 0, saldo_final: 0, children: new Map(), leafCount: 0 };
  for (const r of rows) {
    let parent = root;
    for (let i = 0; i < LEVELS.length; i++) {
      const parsed = splitNode(r[LEVELS[i]] as string | null);
      if (!parsed) break;
      const key = parsed.code;
      let node = parent.children.get(key);
      if (!node) {
        node = { key: parent.key + "/" + key, code: parsed.code, label: parsed.label, level: i, realizado: 0, saldo_final: 0, children: new Map(), leafCount: 0 };
        parent.children.set(key, node);
      }
      node.realizado += Number(r.REALIZADO) || 0;
      node.saldo_final += Number(r.vl_saldo_final) || 0;
      node.leafCount += 1;
      parent = node;
    }
  }
  return root;
}

function Row({ node, expanded, toggle }: { node: Node; expanded: Set<string>; toggle: (k: string) => void }) {
  const open = expanded.has(node.key);
  const hasChildren = node.children.size > 0;
  const kids = [...node.children.values()].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <>
      <tr className="border-t border-border/60 hover:bg-accent/30">
        <td className="px-3 py-1.5" style={{ paddingLeft: 12 + node.level * 16 }}>
          <button
            className="inline-flex items-center gap-1 text-left"
            onClick={() => hasChildren && toggle(node.key)}
          >
            {hasChildren ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="inline-block w-3" />}
            <span className="font-mono text-[11px] text-muted-foreground">{node.code}</span>
            <span className="ml-1">{node.label}</span>
          </button>
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums text-xs text-muted-foreground">{node.leafCount}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(node.realizado)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(node.saldo_final)}</td>
      </tr>
      {open && kids.map((c) => <Row key={c.key} node={c} expanded={expanded} toggle={toggle} />)}
    </>
  );
}

export default function PlanoContas({ rows }: { rows: ContabRow[] }) {
  const tree = useMemo(() => buildTree(rows), [rows]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const top = [...tree.children.values()].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-22rem)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nível / Conta</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Lançamentos</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Realizado</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Saldo Final</th>
            </tr>
          </thead>
          <tbody>
            {top.map((n) => <Row key={n.key} node={n} expanded={expanded} toggle={toggle} />)}
            {top.length === 0 && (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-8">Sem dados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
