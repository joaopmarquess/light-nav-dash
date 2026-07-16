import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_HOSTINGER_URL as string;
const KEY = import.meta.env.VITE_HOSTINGER_ANON_KEY as string;

export const hostinger = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
