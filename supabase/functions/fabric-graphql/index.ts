import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FABRIC_ENDPOINT =
  "https://c828e62d87624b629e4d92510f64d8e7.zc8.graphql.fabric.microsoft.com/v1/workspaces/c828e62d-8762-4b62-9e4d-92510f64d8e7/graphqlapis/d1b4c3d5-dd04-4924-900b-52d7a324200c/graphql";

// Escopo do Fabric GraphQL / Power BI service
const FABRIC_SCOPE = "https://analysis.windows.net/powerbi/api/.default";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Reutiliza token em memória se ainda faltarem >60s para expirar
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.value;
  }

  // 1) Se um token estático foi provido, usa-o
  const staticToken = Deno.env.get("FABRIC_GRAPHQL_TOKEN");
  if (staticToken) return staticToken;

  // 2) Caso contrário, faz client_credentials no Entra ID
  const tenantId = Deno.env.get("FABRIC_TENANT_ID");
  const clientId = Deno.env.get("FABRIC_CLIENT_ID");
  const clientSecret = Deno.env.get("FABRIC_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Credenciais ausentes: defina FABRIC_TENANT_ID, FABRIC_CLIENT_ID e FABRIC_CLIENT_SECRET (ou FABRIC_GRAPHQL_TOKEN).",
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: FABRIC_SCOPE,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Falha ao obter token do Entra ID (${res.status}): ${text}`);
  }

  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const upstream = await fetch(FABRIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
