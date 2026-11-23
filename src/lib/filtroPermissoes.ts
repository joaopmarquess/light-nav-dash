// Filters the Configurações › Permissões menu tree by a typed text fragment.
export type GrupoPermissao = { label: string; items: { id: string; label: string }[] };

const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Keeps groups whose name contains the text (with every item) or whose items contain it (only those items). Accent- and case-insensitive. */
export function filtrarGruposPermissao<G extends GrupoPermissao>(grupos: G[], texto: string): G[] {
  const termo = normalizar(texto);
  if (!termo) return grupos;
  return grupos.flatMap(g => {
    if (normalizar(g.label).includes(termo)) return [g];
    const items = g.items.filter(i => normalizar(i.label).includes(termo));
    return items.length ? [{ ...g, items }] : [];
  });
}
