type ExpansionNode = { key: string; label: string; children: ExpansionNode[] };

export function initialDreExpansion(nodes: ExpansionNode[], collapsed = false): Record<string, boolean> {
  const open: Record<string, boolean> = {};
  if (collapsed) return open;
  const walk = (items: ExpansionNode[]) => items.forEach(node => {
    if (node.children.length && !/FINANCEIRO/i.test(node.label)) {
      open[node.key] = true;
      walk(node.children);
    }
  });
  walk(nodes);
  return open;
}