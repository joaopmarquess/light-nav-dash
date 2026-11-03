import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { canAccess, deniedAccess, type AxisAccess } from "@/lib/axisAccess";
const Context = createContext({ access: deniedAccess, loading: true, can: (_menu: string) => false, refresh: async () => {} });
export function AxisAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [access, setAccess] = useState<AxisAccess>(deniedAccess);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!user) { setAccess(deniedAccess); setLoading(false); return; }
    const { data, error } = await supabase.rpc("axis_access_snapshot");
    const result = data as unknown as AxisAccess | null;
    setAccess(!error && result ? result : deniedAccess);
    setLoading(false);
  }, [user?.id]);
  useEffect(() => {
    setAccess(deniedAccess); setLoading(true); client.clear();
    let live = true;
    const load = async () => {
      if (!user) { if(live) setLoading(false); return; }
      const { data, error } = await supabase.rpc("axis_access_snapshot");
      if(live) { setAccess(!error && data ? data as unknown as AxisAccess : deniedAccess); setLoading(false); }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    const focus = () => void load(); window.addEventListener("focus", focus);
    return () => { live=false; clearInterval(timer); window.removeEventListener("focus",focus); };
  }, [user?.id, client]);
  return <Context.Provider value={{ access, loading, can: menu => canAccess(access,menu), refresh }}>{children}</Context.Provider>;
}
export const useAxisAccess = () => useContext(Context);