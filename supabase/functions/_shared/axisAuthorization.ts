import { createClient } from "npm:@supabase/supabase-js@2";
export async function authorizeAxis(req: Request, menu: string) {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  const auth = req.headers.get("Authorization");
  if (!url || !key || !auth?.startsWith("Bearer ")) return false;
  const client = createClient(url, key, {global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data,error} = await client.auth.getUser(auth.slice(7));
  if(error || !data.user) return false;
  const check = await client.rpc("axis_can_access",{_user_id:data.user.id,_menu:menu});
  return !check.error && check.data === true;
}