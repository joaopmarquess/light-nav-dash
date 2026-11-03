import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { availableQuarters, quarterFilename } from "./quarterFiles.ts";
import { CACHE_REVISION, cacheIsFresh } from "./cachePolicy.ts";

const base = "https://dadosabertos.ans.gov.br/FTP/PDA/demonstracoes_contabeis/";
const cadop = "https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cache-write-packed"), year: z.number().int().min(2015).max(2100), quarter: z.number().int().min(1).max(4), packed: z.string().min(1).max(12000000).regex(/^[A-Za-z0-9+/=]+$/) }),
  z.object({ action: z.literal("cache-read"), year: z.number().int().min(2015).max(2100), quarter: z.number().int().min(1).max(4) }),
  z.object({ action: z.literal("cache-write"), year: z.number().int().min(2015).max(2100), quarter: z.number().int().min(1).max(4), payload: z.record(z.string().regex(/^\d{6}$/), z.object({ n: z.record(z.string().regex(/^\d{2,5}$/), z.string().max(2000)), r: z.array(z.tuple([z.number().int().min(100000000).max(999999999), z.number().int().min(1).max(4), z.number().finite()])).max(20000), saldosFinais: z.literal(true) })) }),
  z.object({ action: z.literal("periods"), year: z.number().int().min(2000).max(2100).optional() }),
  z.object({ action: z.literal("catalog") }),
  z.object({ action: z.literal("plan") }),
  z.object({ action: z.literal("quarter"), year: z.number().int().min(2000).max(2100), quarter: z.number().int().min(1).max(4) }),
]);
async function official(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(response.status === 404 ? "Arquivo ainda não disponibilizado pela ANS." : "A ANS não respondeu à consulta. Tente novamente.");
  return response;
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Login necessário" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "Conexão indisponível" }, 500);
  const cloud = createClient(url, key);
  const { data, error } = await cloud.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) return json({ error: "Login necessário" }, 401);
  try {
    const input = schema.safeParse(await req.json());
    if (!input.success) return json({ error: "Consulta inválida" }, 400);
    const body = input.data;
    if (body.action === "cache-read" || body.action === "cache-write" || body.action === "cache-write-packed") {
      const owner = data.claims.sub;
      const scoped = createClient(url, key, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      if (body.action === "cache-read") {
        const { data: cached, error: cacheError } = await scoped.from("bench_quarter_cache").select("payload,revision,updated_at").eq("user_id", owner).eq("year", body.year).eq("quarter", body.quarter).maybeSingle();
        if (cacheError) throw new Error(cacheError.message);
        return json({ payload: cached?.revision === CACHE_REVISION ? cached.payload : null, fresh: cached ? cacheIsFresh(body.year, cached.updated_at, cached.revision) : false });
      }
      if (body.action === "cache-write" && Object.values(body.payload).some(file => file.r.some(([, quarter]) => quarter !== body.quarter))) return json({ error: "Trimestre inconsistente." }, 400);
      const payload = body.action === "cache-write-packed" ? { encoding: "gzip-base64", packed: body.packed } : body.payload;
      const { error: cacheError } = await scoped.from("bench_quarter_cache").upsert({ user_id: owner, year: body.year, quarter: body.quarter, revision: CACHE_REVISION, payload, updated_at: new Date().toISOString() });
      if (cacheError) throw new Error(cacheError.message);
      return json({ saved: true });
    }
    if (body.action === "plan") {
      const sourceUrl = Deno.env.get("HOSTINGER_SUPABASE_URL");
      const sourceKey = Deno.env.get("HOSTINGER_SUPABASE_SECRET_ROLE_KEY");
      if (!sourceUrl || !sourceKey) return json({ error: "Plano de contas indisponível" }, 500);
      const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const plano: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: page, error: planError } = await source.from("plano_contas_icontabil")
          .select("_9d,n2,n3,n4,n5,g1,g2,g3,g4")
          .order("_9d").order("conta").order("n2").order("g1").order("g2").order("g3").order("g4")
          .range(from, from + 999);
        if (planError) throw planError;
        plano.push(...(page ?? []));
        if (!page || page.length < 1000) break;
      }
      return json({ plano });
    }
    if (body.action === "periods") {
      const root = await (await official(base)).text();
      const years = [...new Set([...root.matchAll(/href=["'](?:[^"']*\/)?(20\d{2})\/["']/gi)].map(m => Number(m[1])))].sort((a, b) => b - a);
      const year = body.year ?? years[0];
      if (!year || !years.includes(year)) return json({ error: "Ano não disponível na ANS" }, 404);
      const directory = await (await official(`${base}${year}/`)).text();
      const quarters = availableQuarters(directory, year);
      return json({ years, year, quarters, source: `${base}${year}/` });
    }
    const response = await official(body.action === "catalog" ? cadop : `${base}${body.year}/${quarterFilename(body.year, body.quarter)}`);
    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "application/octet-stream" } });
  } catch (e) { return json({ error: e instanceof Error ? e.message : "Falha na consulta ANS" }, 502); }
});