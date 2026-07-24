import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ContabRow, fmtBR } from "./types";

type Node = {
  key: string;
  code: string;
  label: string;
  level: number; // 0=G1..3=G4, 4=CONTA
  realizado: number;
  saldo_final: number;
  children: Map<string, Node>;
  leafCount: number;
};

const GROUPS: (keyof ContabRow)[] = ["G1", "G2", "G3", "G4"];

function splitNode(v: string | null | undefined): { code: string; label: string } | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "0" || s === "-") return null;
  const i = s.indexOf("|");
  if (i < 0) return { code: s, label: s };
  return { code: s.slice(0, i), label: s.slice(i + 1) };
}

function buildTree(rows: ContabRow[]): Node {
  const root: Node = {
    key: "root", code: "", label: "DRE", level: -1,
    realizado: 0, saldo_final: 0, children: new Map(), leafCount: 0,
  };
  for (const r of rows) {
    let parent = root;
    let ok = true;
    for (let i = 0; i < GROUPS.length; i++) {
      const parsed = splitNode(r[GROUPS[i]] as string | null);
      if (!parsed) { ok = false; break; }
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
    if (!ok) continue;
    // CONTA & DESCRICAO (folha)
    const code = String(r.cd_contabil ?? "").trim();
    const desc = String(r.ds_conta ?? "").trim();
    if (!code) continue;
    const key = code;
    let node = parent.children.get(key);
    if (!node) {
      node = { key: parent.key + "/" + key, code, label: desc, level: GROUPS.length, realizado: 0, saldo_final: 0, children: new Map(), leafCount: 0 };
      parent.children.set(key, node);
    }
    node.realizado += Number(r.REALIZADO) || 0;
    node.saldo_final += Number(r.vl_saldo_final) || 0;
    node.leafCount += 1;
  }
  return root;
}

function Row({ node, expanded, toggle }: { node: Node; expanded: Set<string>; toggle: (k: string) => void }) {
  const open = expanded.has(node.key);
  const hasChildren = node.children.size > 0;
  const kids = [...node.children.values()].sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
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

      </tr>
      {open && kids.map((c) => <Row key={c.key} node={c} expanded={expanded} toggle={toggle} />)}
    </>
  );
}

export default function PlanoContas({ rows }: { rows: ContabRow[] }) {
  const tree = useMemo(() => buildTree(rows), [rows]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const top = [...tree.children.values()].sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-22rem)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">G1 / G2 / G3 / G4 / Conta &amp; Descrição</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Lançamentos</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Realizado</th>

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
