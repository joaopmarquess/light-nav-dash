import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CSV_URL =
  "https://dexbensaude.lovable.app/__l5e/assets-v1/93caada5-a0e1-4a3d-873d-f7be01a5d727/dre_gerencial_2t2026.csv";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const text = await (await fetch(CSV_URL)).text();
    const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
    lines.shift();
    const rows = lines.map((l) => {
      const c = l.split(",");
      const g4 = (c[5] || "").trim();
      return {
        nr_ano: Number(c[0]),
        nr_mes: Number(c[1]),
        nr_trimestre: Number(c[7]),
        g1: c[2],
        g2: c[3],
        g3: c[4],
        g4: g4 === "'-" || g4 === "-" ? "" : g4,
        valor: Number(c[6]),
      };
    }).filter((r) => Number.isFinite(r.nr_ano) && Number.isFinite(r.valor));

    await supabase.from("dre_gerencial_2t2026").delete().neq("id", 0);
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("dre_gerencial_2t2026").insert(rows.slice(i, i + 500));
      if (error) throw error;
    }
    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
