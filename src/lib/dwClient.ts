import { createClient } from "@supabase/supabase-js";

// DW Supabase (somente leitura via anon key com RLS pública)
const DW_URL = "https://sqirbbvoshleqcuabbtv.supabase.co";
const DW_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxaXJiYnZvc2hsZXFjdWFiYnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDMyMjIsImV4cCI6MjA5ODY3OTIyMn0.HMAonlELMpXaT0bXfP2FtJQKYo319Wquo48Ty4z4F9I";

export const dw = createClient(DW_URL, DW_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
