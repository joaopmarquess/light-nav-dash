import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPassword = () => {
  const nav = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (window.location.hash.match(/type=(recovery|invite)/)) setPronto(true);
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setPronto(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErro(null);
    if (senha.length < 8) return setErro("A senha deve ter pelo menos 8 caracteres.");
    if (senha !== conf) return setErro("As senhas não conferem.");
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return setErro("Não foi possível alterar a senha. Escolha outra senha ou peça um novo link.");
    setOk(true);
    setTimeout(() => nav("/", { replace: true }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl shadow-sm p-8 space-y-5">
        <h1 className="text-lg font-semibold text-center text-foreground">Criar nova senha</h1>
        {!pronto ? (
          <p className="text-sm text-muted-foreground text-center">Abra esta página pelo link enviado ao seu e-mail.</p>
        ) : ok ? (
          <p className="text-sm text-primary text-center">Senha alterada! Entrando…</p>
        ) : (
          <>
            <div className="space-y-2"><Label htmlFor="s">Nova senha</Label><Input id="s" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="c">Confirmar senha</Label><Input id="c" type="password" value={conf} onChange={(e) => setConf(e.target.value)} required /></div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full">Salvar senha</Button>
          </>
        )}
      </form>
    </div>
  );
};
export default ResetPassword;
