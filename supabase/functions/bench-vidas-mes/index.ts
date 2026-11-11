// Verifica se a ANS já publicou a pasta mensal do PDA 024 para uma competência (AAAAMM).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";

const BASE = "https://dadosabertos.ans.gov.br/FTP/PDA/informacoes_consolidadas_de_beneficiarios-024/";
const schema = z.object({ competencia: z.string().regex(/^20\d{2}(0[1-9]|1[0-2])$/) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  if (!await authorizeAxis(req, "Carteira · Bench Vidas")) return json({ error: "Acesso não autorizado" }, 403);
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "Competência inválida" }, 400);
  const { competencia } = input.data;
  try {
    const r = await fetch(`${BASE}${competencia}/`, { signal: AbortSignal.timeout(30000) });
    if (r.status === 404) return json({ competencia, disponivel: false, arquivos: 0 });
    if (!r.ok) return json({ error: "A ANS não respondeu à consulta. Tente novamente." }, 502);
    const html = await r.text();
    const arquivos = new Set(html.match(/pda-024-icb-[A-Z]{2}-\d{4}_\d{2}\.zip/g) ?? []).size;
    return json({ competencia, disponivel: arquivos > 0, arquivos });
  } catch {
    return json({ error: "A ANS não respondeu à consulta. Tente novamente." }, 502);
  }
});
