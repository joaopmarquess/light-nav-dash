import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAxisAccess } from "@/hooks/useAxisAccess";

const ProtectedRoute = ({ children, menu }: { children: ReactNode; menu?: string }) => {
  const { user, loading } = useAuth();
  const { can, loading: accessLoading } = useAxisAccess();
  if (loading) return <div className="h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (menu && accessLoading) return <div className="p-8 text-muted-foreground">Carregando acessos…</div>;
  if (menu && !can(menu)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
export default ProtectedRoute;
