// routes/ProtectedRoutes.tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useBarangayStore } from "../store/authStore";

interface ProtectedRouteProps {
  isAllowed: boolean;
  redirectPath?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAllowed,
  redirectPath = "/dashboard",
  children,
}) => {
  if (!isAllowed) return <Navigate to={redirectPath} replace />;
  return children ? <>{children}</> : <Outlet />;
};

export const BarangayProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useBarangayStore(state => state.isAuthenticated);

  return (
    <ProtectedRoute
      isAllowed={isAuthenticated}
      redirectPath="/login"
    >
      {children}
    </ProtectedRoute>
  );
};

export const AuthRoutes: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useBarangayStore(state => state.isAuthenticated);

  return (
    <ProtectedRoute
      isAllowed={!isAuthenticated}
      redirectPath="/dashboard"
    >
      {children}
    </ProtectedRoute>
  );
};