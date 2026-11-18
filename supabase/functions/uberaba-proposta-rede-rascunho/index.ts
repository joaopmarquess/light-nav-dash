// Rascunho dos tópicos da Proposta de Credenciamento e Gestão de Rede (Bensaúde|Uberaba), destinada à Siga Soluções,
// a partir das Condições Rede e dos Parâmetros de Resultados Rede. O texto volta para revisão; nada vai ao PDF sem aprovação.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { createOpenAI } from "npm:@ai-sdk/openai@4";
import { APICallError, NoObjectGeneratedError, Output, jsonSchema, streamText } from "npm:ai@7";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODELO = "openai/gpt-6.1-sol";
const SECOES = ["introducao", "condicoes", "gestao"] as const;

const cors = { ...corsHeaders, "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

const t = (max: number) => z.string().max(max);
const entrada = z.object({
  dados: z.object({
    destinatario: t(80),
    condicoes: z.object({ colunas: z.array(t(40)).max(8), linhas: z.array(z.array(t(80)).max(8)).max(10), nota: t(600) }),
    gestao: z.object({
      parametros: z.array(z.object({ item: t(60), valor: t(30) })).max(10),
      regra: t(300),
      frentes: z.array(z.object({ frente: t(60), responsaveis: z.array(t(120)).max(6) })).max(6),
    }),
    condicoesGerais: z.array(z.object({ item: t(80), valor: t(200) })).max(10).default([]),
  }),
});

const schema = jsonSchema<Record<(typeof SECOES)[number], string>>({
  type: "object",
  additionalProperties: false,
  required: [...SECOES],
  properties: Object.fromEntries(SECOES.map((s) => [s, { type: "string" }])),
});

const INSTRUCOES = `Você redige, em português do Brasil, os textos de uma Proposta de Credenciamento e Gestão de Rede do Bensaúde para o projeto Bensaúde|Uberaba, destinada à empresa indicada em DADOS.destinatario.
Use sempre o artigo masculino: "o Bensaúde", "do Bensaúde", "pelo Bensaúde". Escreva "Bensaúde|Uberaba" sem espaços em volta da barra.
Tom institucional, claro e objetivo, sem adjetivos promocionais.

REGRAS INVIOLÁVEIS
1. Use somente os fatos que estão nos DADOS. Não invente nem suponha valores, quantidades, prazos, datas, vigência, reajustes, metas, multas, formas de pagamento, obrigações, exclusividade ou qualquer outra condição.
2. Todo número que você escrever deve aparecer nos DADOS exatamente com a mesma grafia (por exemplo "229", "R$ 200,00", "03/2027"). Não calcule totais, médias, diferenças ou novos valores.
3. Quando a seção precisar de uma informação que não está nos DADOS, escreva um marcador no formato [A definir: o que falta]. Nunca preencha a lacuna com suposições.
4. Não repita os quadros linha a linha: o sistema insere o quadro das Condições de Credenciamento no tópico 2 e o quadro dos Parâmetros no tópico 3, cada um com sua nota. O tópico 4, Condições Gerais (DADOS.condicoesGerais: prazo do contrato e o que muda a partir de 2028), é fixo e inserido pelo sistema; não o redija e não o contradiga.
5. Sem markdown, títulos, numeração ou listas com marcadores.

ESTRUTURA DA PROPOSTA (o texto de cada seção abre o tópico; os quadros vêm logo abaixo)
1. Introdução · 2. Condições de Credenciamento · 3. Gestão de Rede · 4. Condições Gerais (fixo, sem texto da IA).

SEÇÕES (somente estas três)
- introducao: um parágrafo curto (2 a 4 frases) que apresente a proposta ao destinatário, o objeto (credenciamento e gestão da rede assistencial do Bensaúde em Uberaba, MG) e indique que as condições estão nas seções 2 a 4.
- condicoes: 1 ou 2 frases que expliquem o que o quadro mostra (grupos, categorias, quantidades disponíveis, valor por credenciamento e valor máximo projetado), podendo citar o total de referências e o valor máximo total da linha TOTAL. Pode lembrar que o pagamento depende da formalização de cada credenciamento, como na nota.
- gestao: 1 ou 2 frases que expliquem a remuneração da gestão de rede segundo a regra dos DADOS (parcelas fixas a partir do mês de início e, depois, valor por vida sobre as vidas vendidas acumuladas), podendo citar as frentes de Gestão de Rede e seus responsáveis.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  if (!await authorizeAxis(req, "Uberaba Timeline")) return json({ error: "Acesso não autorizado" }, 403);
  const input = entrada.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "Dados da proposta inválidos." }, 400);
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
      messages: [{ role: "user", content: `DADOS (já formatados como no PDF):\n${JSON.stringify(input.data.dados, null, 2)}` }],
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
    console.error("uberaba-proposta-rede-rascunho", status, erro?.responseBody ?? String(e));
    let mensagem = "Não foi possível gerar o rascunho agora. Tente novamente em instantes.";
    if (status === 402) mensagem = "Os créditos de IA do workspace acabaram. Adicione créditos em Settings → Plans & credits.";
    else if (status === 429) mensagem = "Muitas solicitações à IA neste momento. Aguarde um pouco e tente de novo.";
    else if (status === 403) mensagem = "O uso da IA está bloqueado para este workspace. Um administrador precisa liberar o acesso.";
    return json({ error: mensagem }, [402, 403, 429].includes(status) ? status : 502, runHeaders());
  }
});
