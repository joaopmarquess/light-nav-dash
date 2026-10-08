import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
export default ProtectedRoute;
