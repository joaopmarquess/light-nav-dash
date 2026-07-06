import { createClient } from "@supabase/supabase-js";

// DW Supabase (somente leitura via anon key com RLS pública)
const DW_URL = "https://sqirbbvoshleqcuabbtv.supabase.co";
const DW_ANON_KEY = "sb_publishable_-jW8upk_dUYnlN8Qtt6nKQ_Z_lrHjem";

export const dw = createClient(DW_URL, DW_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
