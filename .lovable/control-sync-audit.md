# Atualização Control — 30/10/2026

Referência atual: snapshot CONTROL 62e79820, lido pelas ferramentas entre projetos. A validação anterior abaixo refere-se ao snapshot 666c855e.

## Nova atualização
- Simulador trazido para Control com Otimista, Pessimista e Realista, oito etapas por visão, gravação, retomada, bloqueios, reabertura e exclusão confirmada.
- Simulações privadas próprias do AXIS, com leitura por proprietário e escrita exclusivamente por funções validadas; concorrência e campos obrigatórios conferidos.
- Orçamento 2027 usa o modelo compartilhado com o Simulador; orçamento comum conserva armazenamento control:orc27:, separado do orçamento AXIS. DRE atualizado com suporte da referência, sem expor DRE Trial ou Histórico como novos menus.
- 51 testes aprovados. Sessão autorizada percorreu criação, alteração de PIF para 35.817, gravação, retorno e leitura persistida, três visões e 24 etapas; campos nulos, versão antiga e registro indisponível rejeitados.
- PDF final baixado: 27 páginas A4 paisagem, capturas das oito telas por visão e comparativo. Captura adaptada para ignorar imagens externas ao Simulador; página da visão Otimista inspecionada visualmente.
- Simulações criadas apenas para teste excluídas, sem registros de teste remanescentes; orçamento comum retomou valores próprios. Relatório permaneceu disponível. Build sem erros.
- Não importados registros privados do CONTROL. Para transportar simulações anteriores, exportar as simulações e respectivas visões, etapas e campos na conversa do CONTROL e enviar o arquivo aqui. Não foi realizada comparação autenticada na origem nem publicação automática.

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