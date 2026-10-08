// Convite pontual de usuário (cadastro só por convite). Restrito ao e-mail do administrador.
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN = "denis.santana@bensaude.com.br";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { email, redirectTo } = await req.json().catch(() => ({}));
  const alvo = String(email || "").trim().toLowerCase();
  if (!alvo) return new Response(JSON.stringify({ error: "email obrigatório" }), { status: 400, headers: cors });

  // Primeiro convite (o próprio administrador) dispensa login; demais exigem o administrador logado.
  if (alvo !== ADMIN) {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data } = await admin.auth.getUser(token);
    if (data.user?.email?.toLowerCase() !== ADMIN) return new Response(JSON.stringify({ error: "não autorizado" }), { status: 403, headers: cors });
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(alvo, { redirectTo });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
  return new Response(JSON.stringify({ ok: true, id: data.user?.id }), { headers: { ...cors, "Content-Type": "application/json" } });
});
