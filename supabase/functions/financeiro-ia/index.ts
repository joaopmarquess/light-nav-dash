// Financeiro › Inadimplência › IA: chat que responde sobre os títulos da tela. A ferramenta consultar_titulos
// não roda aqui: o navegador a executa sobre os títulos já carregados (src/lib/inadimplenciaIa.ts).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { convertToModelMessages, jsonSchema, tool, type UIMessage } from "npm:ai@7.0.180";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";
import { createResponsesCall } from "../_shared/responses.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODELO = "openai/gpt-6.1-sol";
const cors = { ...corsHeaders, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id", "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const nul = (type: string, description: string, extra: Record<string, unknown> = {}) => ({ type: [type, "null"], description, ...extra });
const DIMENSOES = ["competencia", "vencimento", "faixaAtraso", "tipoPlano", "coparticipativo", "plano", "planoInterno", "banco", "situacao", "sinistralidade", "beneficiario", "contrato", "responsavel"];

const consultarTitulos = tool({
  description: "Consulta os títulos de contas a receber carregados na tela Inadimplência, com as mesmas regras do grid. Retorna totais, grupos (até 2 níveis) e, se pedido, uma lista de títulos. Use sempre que a pergunta envolver números.",
  inputSchema: jsonSchema({
    type: "object", additionalProperties: false,
    required: ["posicao", "filtros", "agruparPor", "limiteGrupos", "listarTitulos"],
    properties: {
      posicao: nul("string", "Data de posição AAAA-MM-DD. null = posição da tela. Só entram títulos vencidos até a posição; para contar todos os títulos do arquivo use 2099-12-31."),
      filtros: {
        type: ["object", "null"], additionalProperties: false,
        required: ["competenciaDe", "competenciaAte", "tipoPlano", "plano", "planoInterno", "contratoInterno", "coparticipativo", "banco", "situacao", "faixaSinistralidade", "faixaAtraso", "somenteEmAberto", "incluirCancelados", "nome"],
        properties: {
          competenciaDe: nul("string", "Competência inicial AAAAMM."),
          competenciaAte: nul("string", "Competência final AAAAMM."),
          tipoPlano: nul("string", "Tipo de plano exato (ex.: PIF, PCE)."),
          plano: nul("string", "Código cd_plano exato do arquivo (ex.: 17, 169)."),
          planoInterno: nul("string", "Plano de 4 dígitos = início do CD_CONTRATO_INTERNO (ex.: '15' ou '0015'). É o que o usuário costuma chamar de 'plano 15'."),
          contratoInterno: nul("string", "CD_CONTRATO_INTERNO completo (10 dígitos)."),
          coparticipativo: { type: ["string", "null"], enum: ["S", "N", null], description: "S ou N." },
          banco: nul("string", "Nome exato do banco."),
          situacao: nul("string", "Quitação: Q (quitado), L (em aberto), C (cancelado)."),
          faixaSinistralidade: { type: ["string", "null"], enum: ["1", "2", "3", "4", "5", "6", "7", null], description: "1 até 50%; 2 50–75%; 3 75–100%; 4 acima de 100%; 5 sem receita; 6 sem dados; 7 sem contrato interno." },
          faixaAtraso: { type: ["string", "null"], enum: ["1", "2", "3", "4", "5", "6", "7", "8", null], description: "1 em aberto até 30 dias; 2 31–60; 3 61–90; 4 mais de 90; 5 pago em dia; 6 pago 1–5 dias após; 7 6–30 dias após; 8 mais de 30 dias após." },
          somenteEmAberto: nul("boolean", "true = só títulos com saldo em aberto."),
          incluirCancelados: nul("boolean", "true = inclui cancelados (C). Padrão: fora."),
          nome: nul("string", "Parte do nome do responsável financeiro ou do beneficiário."),
        },
      },
      agruparPor: { type: ["array", "null"], items: { type: "string", enum: DIMENSOES }, description: "Até 2 dimensões de agrupamento. planoInterno = plano de 4 dígitos; plano = cd_plano; sinistralidade = faixa de sinistralidade; beneficiario = matrícula e nome do titular." },
      limiteGrupos: nul("integer", "Máximo de grupos por nível (padrão 30, máximo 100), ordenados como no grid."),
      listarTitulos: nul("integer", "Quantos títulos listar (0–50), em aberto primeiro."),
    },
  }),
});

const instrucoes = (contexto: string) => `Você é o assistente da tela Financeiro › Inadimplência do AXIS, do Bensaúde (use sempre "o Bensaúde"). Responda em português do Brasil, de forma curta e direta, como um analista financeiro.
- Para qualquer número, chame consultar_titulos; nunca invente valores. Pode chamar mais de uma vez.
- Diga em uma linha o critério usado (ex.: "plano 15 = contrato interno começando com 0015"), quando a pergunta for ambígua mostre as duas leituras.
- Valores em reais no formato 1.234,56; percentuais com duas casas (0,08%). Use tabelas markdown quando houver vários grupos.
- % Inadimplência = em aberto ÷ a receber; % Recebido = recebido ÷ a receber; sinistralidade = despesas ÷ receitas dos últimos 12 meses do contrato.
- A ferramenta segue a regra da tela: só títulos vencidos até a posição; cancelados fora, salvo pedido. Avise quando isso afetar a contagem.
- Ao responder sobre um conjunto de títulos, traga quantidade, a receber, recebido, em aberto e % inadimplência; quando ajudar, um desdobramento (ex.: por cd_plano ou faixa) e os cancelados à parte.
- Não mostre CPF/CNPJ.
Contexto da base:
${contexto}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  if (!await authorizeAxis(req, "Financeiro · Inadimplência")) return json({ error: "Acesso não autorizado à Inadimplência." }, 403);
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "IA não configurada." }, 500);
  let body: { messages?: unknown; contexto?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Pedido inválido." }, 400); }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 200) return json({ error: "Conversa inválida." }, 400);
  const contexto = typeof body.contexto === "string" ? body.contexto.slice(0, 8000) : "";
  try {
    const messages = body.messages as UIMessage[];
    const modelMessages = await convertToModelMessages(messages);
    const call = createResponsesCall(req, { baseURL: GATEWAY, apiKey, model: MODELO }, modelMessages, instrucoes(contexto), { tools: { consultar_titulos: consultarTitulos } });
    return await call.response(cors, messages, (e) => {
      const err = e as { statusCode?: number; message?: string };
      console.error("financeiro-ia stream", err?.statusCode, err?.message);
      if (err?.statusCode === 402) return "Os créditos de IA acabaram. Um administrador pode comprar mais em Configurações › Planos e créditos.";
      if (err?.statusCode === 429) return "Muitas perguntas seguidas. Aguarde um pouco e pergunte de novo.";
      if (err?.statusCode === 403) return err.message || "O acesso à IA foi negado.";
      return "A IA não conseguiu responder agora. Tente de novo.";
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return new Response(null, { status: 499, headers: cors });
    console.error("financeiro-ia", e);
    return json({ error: "Não foi possível falar com a IA agora." }, 500);
  }
});
