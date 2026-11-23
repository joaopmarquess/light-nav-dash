// "Pesquisar App": catalogue of every AXIS screen with its menu path, built from the same navigation lists as the sidebar.
import { menuItems, labItems, homeShortcuts } from "@/lib/axisNavigation";

export type TelaApp = { id: string; label: string; caminho: string[]; termos: string[] };

export const normalizarBusca = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Every reachable screen once (by destination id), with the path the user follows in the menus; Home shortcut names become extra search terms. */
export function catalogoTelas(): TelaApp[] {
  const telas: TelaApp[] = [];
  const add = (id: string, label: string, caminho: string[]) => { if (!telas.some(t => t.id === id)) telas.push({ id, label, caminho, termos: [] }); };
  for (const g of menuItems) {
    if (!g.children) { add(g.label, g.label, [g.label]); continue; }
    for (const c of g.children) {
      if (c.id === "__cfg_control__") continue;
      const caminho = c.id === "Control · Contas" ? [g.label, "Configurações", c.label] : c.grupo ? [g.label, c.grupo, c.label] : [g.label, c.label];
      add(c.id ?? c.label, c.label, caminho);
    }
  }
  add("Laboratory", "Laboratory", ["Laboratory"]);
  for (const g of labItems) {
    const grupo = g.label.trim();
    if (!g.children) { add(g.label, grupo, ["Laboratory", grupo]); continue; }
    for (const c of g.children) add(c.id ?? c.label, c.label, ["Laboratory", grupo, c.label]);
  }
  for (const s of homeShortcuts) {
    const tela = telas.find(t => t.id === s.destination);
    if (tela) { if (s.label !== tela.label) tela.termos.push(s.label); }
    else add(s.destination, s.label, ["Home", "Atalhos", s.label]);
  }
  add("Configurações", "Configurações", ["Configurações"]);
  return telas;
}

/** Screens whose name, path or shortcut name contains every typed word (accent/case-insensitive); exact-name matches first. */
export function pesquisarTelas(texto: string, telas: TelaApp[] = catalogoTelas()): TelaApp[] {
  const palavras = normalizarBusca(texto).split(/\s+/).filter(Boolean);
  if (!palavras.length) return [];
  const achados = telas.filter(t => {
    const alvo = normalizarBusca([t.label, ...t.caminho, ...t.termos].join(" "));
    return palavras.every(p => alvo.includes(p));
  });
  const termo = palavras.join(" ");
  const peso = (t: TelaApp) => normalizarBusca(t.label) === termo ? 0 : normalizarBusca(t.label).startsWith(termo) ? 1 : normalizarBusca(t.label).includes(termo) ? 2 : 3;
  return achados.map((t, i) => ({ t, i })).sort((a, b) => peso(a.t) - peso(b.t) || a.i - b.i).map(x => x.t);
}
