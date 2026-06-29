import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FABRIC_ENDPOINT =
  "https://c828e62d87624b629e4d92510f64d8e7.zc8.graphql.fabric.microsoft.com/v1/workspaces/c828e62d-8762-4b62-9e4d-92510f64d8e7/graphqlapis/d1b4c3d5-dd04-4924-900b-52d7a324200c/graphql";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("FABRIC_GRAPHQL_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({
        error:
          "FABRIC_GRAPHQL_TOKEN não configurado. Adicione o token (Bearer do Entra ID com escopo do Fabric GraphQL) nas secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
