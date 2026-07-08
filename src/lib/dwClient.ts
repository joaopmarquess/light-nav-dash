import { createClient } from "@supabase/supabase-js";

// DW agora é o mesmo projeto Supabase da aplicação (ref: yunyqyomnaztlzggnufk).
// Criamos um client sem tipagem gerada para permitir consultas a tabelas/RPCs
// que ainda não estejam refletidas em src/integrations/supabase/types.ts.
const DW_URL = import.meta.env.VITE_SUPABASE_URL as string;
const DW_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const dw = createClient(DW_URL, DW_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
