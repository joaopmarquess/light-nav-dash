import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

// Aviso de atualização do AXIS: só o administrador (permissão Configurações) envia,
// um e-mail por usuário ativo (situação OK), com texto escrito por ele.
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const input = z.object({ novidades: z.string().trim().min(3).max(3000) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido." }, 405);
  if (!await authorizeAxis(req, "Configurações")) return json({ error: "Acesso restrito ao administrador." }, 403);
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Escreva as novidades (até 3.000 caracteres)." }, 400);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: users, error } = await admin.from("axis_access_users").select("user_id,email,nome").eq("status", "ok");
  if (error) return json({ error: "Não foi possível consultar os usuários." }, 500);
  const avisoId = crypto.randomUUID();
  let enviados = 0, bloqueados = 0, falhas = 0;
  for (const u of users ?? []) {
    try {
      const r = await sendTemplateEmail("axis-atualizacao", u.email, {
        templateData: { nome: u.nome, novidades: parsed.data.novidades, link: "https://axisbensaude.lovable.app" },
        idempotencyKey: `axis-atualizacao-${avisoId}-${u.user_id}`,
      });
      if (r.sent) enviados++; else bloqueados++;
    } catch (e) {
      console.error("Falha ao avisar", u.email, e);
      falhas++;
    }
  }
  return json({ ok: true, total: users?.length ?? 0, enviados, bloqueados, falhas });
});
