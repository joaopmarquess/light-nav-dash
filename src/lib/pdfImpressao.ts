/**
 * Página HTML usada para imprimir os relatórios em PDF (uma imagem por página).
 * Cada página ocupa exatamente uma folha A4, com quebra só ENTRE páginas: nunca depois da última,
 * para a impressão (inclusive frente e verso) não ganhar uma folha em branco no fim.
 */
export function htmlImpressao(paginas: string[], paisagem: boolean): string {
  const orient = paisagem ? "landscape" : "portrait";
  // Altura um pouco menor que a folha: arredondamentos do navegador não empurram a página para uma folha extra.
  const [w, h] = paisagem ? ["297mm", "209.5mm"] : ["210mm", "296.5mm"];
  const corpo = paginas
    .map((src, i) => {
      const quebra = i < paginas.length - 1 ? "break-after:page;page-break-after:always;" : "";
      return `<div class="pg" style="${quebra}"><img src="${src}" alt="" /></div>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>
<style>
  @page { size: A4 ${orient}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .pg { width: ${w}; height: ${h}; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .pg img { display: block; width: 100%; height: 100%; object-fit: contain; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head><body>${corpo}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);};</script></body></html>`;
}
