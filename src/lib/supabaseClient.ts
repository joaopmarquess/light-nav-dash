import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xyuzylbaainzrxrukrou.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dXp5bGJhYWluenJ4cnVrcm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzExNzcsImV4cCI6MjA5ODA0NzE3N30.kwhQKqeVQtKMJDkwlH054VA2iy1yk4pVc9G8ddgrzvo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
