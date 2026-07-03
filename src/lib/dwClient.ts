import { createClient } from "@supabase/supabase-js";

// DW Supabase (somente leitura via anon key com RLS)
const DW_URL = "https://fqgztasqftrjbdtkudqb.supabase.co";
const DW_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZ3p0YXNxZnRyamJkdGt1ZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMTY3MTQsImV4cCI6MjA5Njg5MjcxNH0.zYKLZvFa87pB8DFtbxJTqBzg7BBhpF7UeDqXtkh7d3o";

export const dw = createClient(DW_URL, DW_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
