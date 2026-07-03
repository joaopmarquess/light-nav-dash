import { createClient } from "@supabase/supabase-js";

// DW Supabase (somente leitura via anon key com RLS)
const DW_URL = "https://fqgztasqftrjbdtkudqb.supabase.co";
const DW_ANON_KEY = "sb_publishable_DRwqgoKQ6rz0GPnG09VaKQ_e2anP6Rf";

export const dw = createClient(DW_URL, DW_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
