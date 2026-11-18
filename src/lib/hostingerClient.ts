import { createClient } from "@supabase/supabase-js";
import { MSG_TEMPO_ESGOTADO } from "@/lib/erroDados";

const URL = import.meta.env.VITE_HOSTINGER_URL as string;
const KEY = import.meta.env.VITE_HOSTINGER_ANON_KEY as string;
/** Limite de espera por resposta: evita telas carregando indefinidamente quando o servidor não responde. */
const LIMITE_MS = 90_000;

const fetchComLimite: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error(MSG_TEMPO_ESGOTADO)), LIMITE_MS);
  init?.signal?.addEventListener("abort", () => ctrl.abort(init.signal?.reason), { once: true });
  return fetch(input, { ...init, signal: ctrl.signal })
    .catch((e) => { throw ctrl.signal.aborted && !init?.signal?.aborted ? new Error(MSG_TEMPO_ESGOTADO) : e; })
    .finally(() => clearTimeout(timer));
};

export const hostinger = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchComLimite },
});
