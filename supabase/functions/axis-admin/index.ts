import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { authorizeAxis } from "../_shared/axisAuthorization.ts";
import { isAxisInviteOriginAllowed } from "../_shared/axisInviteOrigin.ts";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json","Cache-Control":"no-store"}});
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,"0")).join("");
const input=z.discriminatedUnion("action",[
  z.object({action:z.literal("list")}),
  z.object({action:z.literal("invite"),email:z.string().trim().email().max(255),nome:z.string().trim().max(150),role:z.enum(["user","master"]),origin:z.string().url()}),
  z.object({action:z.literal("complete"),token:z.string().min(10).max(500),password:z.string().min(8).max(128)}),
]);
Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Método inválido."},405);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key) return json({error:"Serviço indisponível."},500);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const parsed=input.safeParse(await req.json());
    if(!parsed.success) return json({error:"Dados inválidos."},400);
    const body=parsed.data;
    const auth=req.headers.get("Authorization")?.replace(/^Bearer /,"") ?? "";
    const {data:identity,error:identityError}=await admin.auth.getUser(auth);
    if(identityError||!identity.user) return json({error:"Entre no AXIS novamente."},401);
    if(body.action==="complete") {
      const user=identity.user;
      const {data:record,error}=await admin.from("axis_access_users").select("*").eq("user_id",user.id).maybeSingle();
      const hash=await digest(body.token);
      if(error||!record||record.status!=="pending"||record.email!==user.email?.toLowerCase()||record.invite_digest!==hash||!record.invite_expires_at||Date.parse(record.invite_expires_at)<=Date.now()) return json({error:"Convite inválido, expirado ou já utilizado. Peça um novo link ao administrador."},403);
      // Claim once before the privileged password update, preventing concurrent redemptions.
      const {data:claimed,error:claimError}=await admin.from("axis_access_users").update({invite_digest:null}).eq("user_id",user.id).eq("status","pending").eq("invite_digest",hash).select("user_id").maybeSingle();
      if(claimError||!claimed) return json({error:"Este convite já foi utilizado."},409);
      const changed=await admin.auth.admin.updateUserById(user.id,{password:body.password});
      if(changed.error) {
        await admin.from("axis_access_users").update({invite_digest:hash}).eq("user_id",user.id).eq("status","pending").is("invite_digest",null);
        return json({error:"Não foi possível definir a senha. Escolha outra senha e tente novamente."},400);
      }
      const {error:activated}=await admin.from("axis_access_users").update({status:"ok",activated_at:new Date().toISOString(),invite_expires_at:null,updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("status","pending").is("invite_digest",null);
      if(activated) return json({error:"Senha definida, mas a conclusão não foi gravada. Contate o administrador."},500);
      return json({ok:true});
    }
    if(!await authorizeAxis(req,"Configurações")) return json({error:"Acesso restrito ao administrador principal."},403);
    if(body.action==="list") {
      const [users,roles,permissions]=await Promise.all([admin.from("axis_access_users").select("user_id,email,nome,status,created_at,activated_at,invite_expires_at").order("created_at"),admin.from("user_roles").select("user_id,role"),admin.from("axis_menu_permissions").select("user_id,menu_id")]);
      if(users.error||roles.error||permissions.error) return json({error:"Não foi possível consultar os usuários."},500);
      return json({users:(users.data??[]).map(u=>({...u,role:roles.data?.find(r=>r.user_id===u.user_id)?.role??"user",permissions:permissions.data?.filter(p=>p.user_id===u.user_id).map(p=>p.menu_id)??[]}))});
    }
    // The callback may only use the requesting app's origin, never an arbitrary external host.
    const origin=new URL(body.origin).origin;
    const requestOrigin=req.headers.get("Origin");
    if(!isAxisInviteOriginAllowed(origin,requestOrigin)) return json({error:"Endereço de convite inválido."},400);
    const email=body.email.toLowerCase();
    const {data:existing}=await admin.from("axis_access_users").select("*").eq("email",email).maybeSingle();
    if(existing) {
      const r=await admin.from("user_roles").select("role").eq("user_id",existing.user_id).eq("role","admin").maybeSingle();
      if(r.data||existing.status!=="pending") return json({error:"Usuário já cadastrado. Edite os acessos na lista."},409);
      if(Date.now()-Date.parse(existing.updated_at)<30000) return json({error:"Aguarde 30 segundos antes de gerar outro link."},429);
    }
    const type=existing?"recovery":"invite";
    const generated=await admin.auth.admin.generateLink({type,email,options:{redirectTo:`${origin}/ativar`,data:{nome:body.nome}}});
    if(generated.error||!generated.data.user||!generated.data.properties?.hashed_token) return json({error:"Não foi possível gerar o convite. O e-mail pode já ter uma conta; contate o administrador."},400);
    const user=generated.data.user,token=generated.data.properties.hashed_token;
    const expires=new Date(Date.now()+60*60*1000).toISOString();
    const saved=await admin.from("axis_access_users").upsert({user_id:user.id,email,nome:body.nome,status:"pending",invite_digest:await digest(token),invite_expires_at:expires,updated_at:new Date().toISOString()});
    if(saved.error) return json({error:"Não foi possível gravar o cadastro."},500);
    if(!existing) {
      const roleSave=await admin.from("user_roles").insert({user_id:user.id,role:body.role});
      if(roleSave.error) return json({error:"Não foi possível gravar o perfil."},500);
    }
    const destination=origin==="http://localhost:8080"?origin:"https://axisbensaude.lovable.app";
    return json({ok:true,user_id:user.id,expires_at:expires,link:`${destination}/ativar#token_hash=${encodeURIComponent(token)}&type=${type}`});
  }catch {return json({error:"Não foi possível concluir a solicitação."},500);}
});