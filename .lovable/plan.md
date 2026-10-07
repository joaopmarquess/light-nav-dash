## Menu "Control" abrindo o programa Control dentro desta tela

**O que muda**
- Novo item "Control" no menu lateral, como item próprio, sem submenu, posicionado antes de "B.I. Overview".
- Ao clicar, a área principal mostra o programa Control (https://controlbensaude.lovable.app) embutido e ocupando toda a área, do mesmo jeito que o item "PBI U12" já faz.
- No topo, um pequeno botão "Abrir em nova aba", útil quando o navegador bloquear algo embutido.

**Observações**
- O Control precisa estar publicado. Hoje ele já está, e as alterações feitas lá aparecem aqui depois de cada nova publicação.
- Se o Control pedir login, o acesso acontece dentro da própria tela embutida.

**Detalhes técnicos**
- `src/pages/Index.tsx`: incluir `{ icon: Settings2, label: "Control" }` em `menuItems` e um ramo `active === "Control"` que renderiza um `<iframe src="https://controlbensaude.lovable.app">` em tela cheia, com o `<main>` sem padding nesse caso.
