import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
}

export function ProtectedRoute({ children, requireVerified = true }: ProtectedRouteProps) {
  const { user, isLoading, isVerified } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !isVerified) {
    return <Navigate to="/verify" replace />;
  }

  return <>{children}</>;
}
