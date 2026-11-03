import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:corsHeaders});
  const authorized=await authorizeAxis(req,"Configurações");
  return new Response(JSON.stringify({error:authorized?"Use Configurações › Usuários para gerar o convite individual por link.":"Acesso não autorizado."}),{status:authorized?410:403,headers:{...corsHeaders,"Content-Type":"application/json"}});
});