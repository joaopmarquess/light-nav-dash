import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoFull from "@/assets/axis-logo.png.asset.json";

const emailSchema = z.string().trim().email("E-mail inválido").max(255);

const Login = () => {
  const { user, loading } = useAuth();
  const [modo, setModo] = useState<"login" | "esqueci">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null); setAviso(null);
    const v = emailSchema.safeParse(email);
    if (!v.success) { setErro(v.error.issues[0].message); return; }
    setEnviando(true);
    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: v.data, password: senha });
      if (error) setErro("E-mail ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(v.data, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) setErro("Não foi possível enviar o e-mail. Tente novamente.");
      else setAviso("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
    }
    setEnviando(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-8 space-y-5">
        <div className="flex justify-center"><img src={logoFull.url} alt="AXIS" className="h-16 object-contain" /></div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">{modo === "login" ? "Entrar no sistema" : "Esqueci minha senha"}</h1>
          <p className="text-xs text-muted-foreground">{modo === "login" ? "Acesso restrito a usuários autorizados" : "Informe seu e-mail para receber o link"}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {modo === "login" && (
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
        )}
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {aviso && <p className="text-sm text-primary">{aviso}</p>}
        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "login" ? "Entrar" : "Enviar link"}
        </Button>
        <button type="button" onClick={() => { setModo(modo === "login" ? "esqueci" : "login"); setErro(null); setAviso(null); }}
          className="w-full text-sm text-muted-foreground hover:text-primary">
          {modo === "login" ? "Esqueci minha senha" : "Voltar para o login"}
        </button>
      </form>
    </div>
  );
};
export default Login;
