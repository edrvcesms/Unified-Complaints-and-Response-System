import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useUserRole } from "../hooks/useUserRole";
import type { UserRole } from "../types/auth/userRole";

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

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  allowedRoles, 
  children 
}) => {
  const { isAuthenticated, userRole, hasInvalidRole } = useUserRole();

  if (!isAuthenticated) {
    return <Navigate to="/officials-login" replace />;
  }

  if (hasInvalidRole) {
    return <Navigate to="/officials-login" replace />;
  }

  if (userRole && !allowedRoles.includes(userRole)) {
    if (userRole === 'barangay_official') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'lgu_official') {
      return <Navigate to="/lgu/dashboard" replace />;
    }
    if (userRole === 'department_staff') {
      return <Navigate to="/department/dashboard" replace />;
    }
    return <Navigate to="/officials-login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const BarangayProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <ProtectedRoute
      isAllowed={isAuthenticated}
      redirectPath="/officials-login"
    >
      {children}
    </ProtectedRoute>
  );
};

export const BarangayRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <RoleProtectedRoute allowedRoles={['barangay_official']}>
      {children}
    </RoleProtectedRoute>
  );
};

export const LguRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <RoleProtectedRoute allowedRoles={['lgu_official']}>
      {children}
    </RoleProtectedRoute>
  );
};

export const DepartmentRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <RoleProtectedRoute allowedRoles={['department_staff']}>
      {children}
    </RoleProtectedRoute>
  );
};

export const AuthRoutes: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userRole } = useUserRole();

  if (isAuthenticated) {
    if (userRole === 'barangay_official') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'lgu_official') {
      return <Navigate to="/lgu/dashboard" replace />;
    }
    if (userRole === 'department_staff') {
      return <Navigate to="/department/dashboard" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};