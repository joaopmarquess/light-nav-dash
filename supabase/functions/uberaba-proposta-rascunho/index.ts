// Rascunho dos tópicos 3 a 5 da Proposta Comercial Bensaúde|Uberaba a partir das tabelas de Resultados Comerciais.
// Os tópicos 1 e 2 são texto fixo do usuário: chegam só como contexto e nunca são reescritos.
// Lovable AI Gateway (Responses, saída estruturada). O texto volta para revisão do usuário; nada vai ao PDF sem aprovação.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { createOpenAI } from "npm:@ai-sdk/openai@4";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText } from "npm:ai@7";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODELO = "openai/gpt-6-astra";
const SECOES = ["tabelas", "remuneracao", "conclusao"] as const;

const cors = { ...corsHeaders, "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

const texto = (max: number) => z.string().max(max);
const faixa = z.object({ faixa: texto(20), enfermaria: texto(20), apartamento: texto(20) });
const entrada = z.object({
  dados: z.object({
    referencia: z.object({ fatorApartamento: texto(20), regraApartamento: texto(80), faixas: z.array(faixa).max(20) }),
    tabelas: z.array(z.object({
      nome: texto(60), segmento: texto(60), indiceSobreReferencia: texto(20), fatorApartamento: texto(20), regraApartamento: texto(80),
      faixas: z.array(faixa).max(20),
      indicadores: z.array(z.object({ bloco: texto(40), item: texto(40), valor: texto(20), formula: texto(60).nullable() })).max(20),
    })).min(1).max(5),
  }),
  contexto: z.object({ introducao: texto(4000), referencia: texto(4000) }).partial().optional(),
});

const schema = jsonSchema<Record<(typeof SECOES)[number], string>>({
  type: "object",
  additionalProperties: false,
  required: [...SECOES],
  properties: Object.fromEntries(SECOES.map((s) => [s, { type: "string" }])),
});

const INSTRUCOES = `Você redige, em português do Brasil, os textos de uma Proposta Comercial do Bensaúde para o projeto Bensaúde|Uberaba.
Use sempre o artigo masculino: "o Bensaúde", "do Bensaúde", "pelo Bensaúde". Escreva "Bensaúde|Uberaba" sem espaços em volta da barra.
Tom institucional, claro e objetivo, sem adjetivos promocionais.

REGRAS INVIOLÁVEIS
1. Use somente os fatos que estão nos DADOS e no CONTEXTO enviados. Não invente nem suponha preços, percentuais, descontos, prazos, carências, coparticipação, reajustes, datas, vigência, validade, abrangência, rede credenciada, hospitais, documentos, formas de pagamento ou qualquer outra condição comercial.
2. Todo número que você escrever deve aparecer nos DADOS exatamente com a mesma grafia (por exemplo "1,25", "23%", "157,50"). Não calcule médias, totais, diferenças ou novos valores.
3. Quando a seção precisar de uma informação que não está nos DADOS, escreva um marcador entre colchetes no formato [A definir: o que falta]. Nunca preencha a lacuna com suposições.
4. Não repita as tabelas faixa a faixa: o sistema as insere nos tópicos 2 · Tabela Referencial e 3 · Tabelas. Refira-se a elas pelo nome.
5. Sem markdown, títulos, numeração ou listas com marcadores. Seja breve, como indicado em cada seção.

ESTRUTURA DA PROPOSTA (o texto de cada seção abre o tópico; tabelas e quadros são inseridos logo abaixo pelo sistema)
1. Introdução · 2. Tabela Referencial · 3. Tabelas · 4. Proposta de Remuneração · 5. Conclusão · 6. Glossário e Notas Explicativas.
Os tópicos 1 e 2 já estão escritos (CONTEXTO) e não fazem parte da sua resposta. Você pode usar os fatos do CONTEXTO (por exemplo, os parceiros de distribuição), sem copiar trechos.

SEÇÕES (somente estas três)
- tabelas: uma única frase simples informando que, abaixo, estão as tabelas de preços dos Produtos. Sem números.
- remuneracao: uma única frase simples informando que, abaixo, estão os percentuais e as condições comerciais para a distribuição dos Produtos. Sem números.
- conclusao: um parágrafo curto (2 ou 3 frases) que encerre a proposta com cordialidade, sem novos compromissos, prazos ou condições.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  if (!await authorizeAxis(req, "Uberaba Timeline")) return json({ error: "Acesso não autorizado" }, 403);
  const input = entrada.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "Dados das tabelas inválidos." }, 400);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "A IA não está configurada neste projeto." }, 500);

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const runHeaders = (): Record<string, string> => {
    const id = runIdFetch.getRunId();
    return id ? { "X-Lovable-AIG-Run-ID": id } : {};
  };

  try {
    const result = streamText({
      model: provider.responses(MODELO),
      instructions: INSTRUCOES,
      messages: [{
        role: "user",
        content: `CONTEXTO (tópicos 1 e 2, já escritos):\n${JSON.stringify(input.data.contexto ?? {}, null, 2)}\n\nDADOS (tabelas de Resultados Comerciais, já formatadas como no PDF):\n${JSON.stringify(input.data.dados, null, 2)}`,
      }],
      output: Output.object({ schema }),
      abortSignal: req.signal,
      maxRetries: 1,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const textos = await result.output;
    return json({ textos, modelo: MODELO }, 200, runHeaders());
  } catch (e) {
    if (req.signal.aborted || (e instanceof Error && e.name === "AbortError")) return json({ error: "Geração cancelada." }, 499, runHeaders());
    if (NoObjectGeneratedError.isInstance(e)) return json({ error: "A IA não devolveu um rascunho completo. Tente gerar novamente." }, 502, runHeaders());
    const erro = APICallError.isInstance(e) ? e : APICallError.isInstance((e as { lastError?: unknown })?.lastError) ? (e as { lastError: APICallError }).lastError : null;
    const status = erro?.statusCode ?? 500;
    console.error("uberaba-proposta-rascunho", status, erro?.responseBody ?? String(e));
    let mensagem = "Não foi possível gerar o rascunho agora. Tente novamente em instantes.";
    if (status === 402) mensagem = "Os créditos de IA do workspace acabaram. Adicione créditos em Settings → Plans & credits.";
    else if (status === 429) mensagem = "Muitas solicitações à IA neste momento. Aguarde um pouco e tente de novo.";
    else if (status === 403) mensagem = "O uso da IA está bloqueado para este workspace. Um administrador precisa liberar o acesso.";
    return json({ error: mensagem }, [402, 403, 429].includes(status) ? status : 502, runHeaders());
  }
});
