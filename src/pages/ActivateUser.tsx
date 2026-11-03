import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAxisAccess } from "@/hooks/useAxisAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/axis-logo.png.asset.json";
let verification: Promise<boolean> | null = null;
let inviteToken="";
export default function ActivateUser(){
 const {refresh}=useAxisAccess();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [password,setPassword]=useState(""),[confirmation,setConfirmation]=useState("");
 useEffect(()=>{
  const params=new URLSearchParams(window.location.hash.slice(1));
  const token=params.get("token_hash"),type=params.get("type");
  if(token&&(type==="invite"||type==="recovery")){
   inviteToken=token;history.replaceState(null,"",window.location.pathname);
   verification=supabase.auth.verifyOtp({token_hash:token,type}).then(({error})=>!error);
  }
  if(!verification){setError("Convite inválido. Peça um novo link ao administrador.");return;}
  verification.then(valid=>{setReady(valid);if(!valid)setError("Convite inválido, expirado ou já utilizado. Peça um novo link ao administrador.");});
 },[]);
 async function submit(e:FormEvent){e.preventDefault();setError("");if(password.length<8){setError("A senha deve ter pelo menos 8 caracteres.");return;}if(password!==confirmation){setError("As senhas não conferem.");return;}setBusy(true);
  const {data,error}=await supabase.functions.invoke("axis-admin",{body:{action:"complete",token:inviteToken,password}});
  setBusy(false);if(error||data?.error){setError(data?.error??"Não foi possível concluir. Tente novamente.");return;}inviteToken="";verification=null;setOk(true);await refresh();
 }
 return <div className="min-h-screen flex items-center justify-center bg-background p-4"><form onSubmit={submit} className="w-full max-w-sm border border-border bg-card rounded-lg p-8 space-y-5"><img src={logo.url} alt="AXIS" className="mx-auto h-16 object-contain"/><h1 className="text-center text-lg font-semibold">{ok?"Cadastro concluído":"Definir sua senha"}</h1>{ok?<><p className="text-sm text-primary">Seu acesso está pronto.</p><Button asChild className="w-full"><Link to="/">Entrar no AXIS</Link></Button></>:ready?<><div className="space-y-2"><Label htmlFor="new-password">Senha</Label><Input id="new-password" type="password" autoComplete="new-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></div><Button disabled={busy} className="w-full">{busy?"Aguarde…":"Concluir cadastro"}</Button></>:!error?<p className="text-sm text-muted-foreground">Validando convite…</p>:null}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</form></div>;
}