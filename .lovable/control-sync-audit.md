# Atualização Control — 30/10/2026

Referência: snapshot atual do CONTROL, commit 666c855e, lido pelas ferramentas entre projetos.

## Corrigido
- Organização: Demonstrações, Relatório, Orçamento 2026, Orçamento 2027, Slides, Configurações > Contas.
- Títulos e tooltips completos, DRE nos controles e subtítulo de Slides; demais telas Control sem subtítulo duplicado.
- Controles Painel/DRE e referências textuais no relatório/gráficos alinhados ao CONTROL.
- PDF: títulos completos, capa e sumário com quebra de linhas e altura variável; conteúdo renderizado na tela é o próprio PDF exportado.
- Home própria do Control inicia nos cards; Home geral AXIS preservada.
- Simulação Control com armazenamento separado do orçamento próprio AXIS; restauração ao sair do menu, conforme referência.
- Altura do relatório limitada ao espaço disponível dentro do AXIS, sem cortar a área de leitura.

## Preservado
Autenticação, permissões, clientes AXIS, todas as outras telas e os tópicos Carteira, Assistencial, DRE/G2/G3, Orçamento e Conclusão.
Os cálculos, filtros de Contas e consultas Hostinger já coincidiam com a referência. Balancete já consultava um mês por vez e ordenava por conta, débito e crédito; adicionado teste específico de paginação.

## Validação
- 41 testes Control aprovados.
- Sessão autenticada: Painel/DRE, Orçamento 2026 Painel/DRE, 2027 Painel/DRE, Slides anterior/próximo/pausa, Contas manutenção/mês agosto e formulário Nova sem gravar dados.
- Jan–ago/2026: DRE e Contas totalizam −R$ 2.534.730,98.
- Agosto/2026: Contas e DRE no relatório reconciliam R$ 3.961.448,01. Orçamento mostra R$ 2.614.555,69 após imposto estimado de 34%; diferença esperada da referência, não ajuste forçado.
- PDF de agosto: 15 páginas A4, mesmo período aplicado, capa/sumário/rodapés e download manual conferidos.
- Retorno à Home geral AXIS conferido.

## Limites
Checkout não fornece sessão nem registros privados do CONTROL. A comparação é de código; não foi possível validar números autenticados dentro do projeto de origem.
Não houve importação de registros. Se forem exigidos registros iguais entre projetos, exportar do CONTROL orçamento_2026 (previsto/projetado/realizado por item e mês) e plano_contas_historico (cadastros/alterações de contas) e enviar aqui; a necessidade exata depende de divergência constatada com o mesmo período no projeto de origem.
Não publicado automaticamente.