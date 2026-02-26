// routes/ProtectedRoutes.tsx
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

/**
 * Route guard that checks both authentication and user role
 */
export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  allowedRoles, 
  children 
}) => {
  const { isAuthenticated, userRole } = useUserRole();

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role - redirect based on their role
  if (userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on user's role
    if (userRole === 'barangay_official') {
      return <Navigate to="/dashboard" replace />;
    }
    if (userRole === 'lgu_official') {
      return <Navigate to="/lgu/dashboard" replace />;
    }
    if (userRole === 'department_staff') {
      return <Navigate to="/department/dashboard" replace />;
    }
    // Fallback to login if role is unknown
    return <Navigate to="/login" replace />;
  }

  // Authenticated and has correct role
  return children ? <>{children}</> : <Outlet />;
};

/**
 * Legacy component for backward compatibility - authenticates only, no role check
 */
export const BarangayProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <ProtectedRoute
      isAllowed={isAuthenticated}
      redirectPath="/login"
    >
      {children}
    </ProtectedRoute>
  );
};

/**
 * Route guard for barangay officials only
 */
export const BarangayRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <RoleProtectedRoute allowedRoles={['barangay_official']}>
      {children}
    </RoleProtectedRoute>
  );
};

/**
 * Route guard for LGU officials only
 */
export const LguRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <RoleProtectedRoute allowedRoles={['lgu_official']}>
      {children}
    </RoleProtectedRoute>
  );
};

/**
 * Route guard for department staff only
 */
export const DepartmentRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <RoleProtectedRoute allowedRoles={['department_staff']}>
      {children}
    </RoleProtectedRoute>
  );
};

/**
 * Routes that should only be accessible when NOT authenticated
 */
export const AuthRoutes: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userRole } = useUserRole();

  // Already authenticated - redirect to appropriate dashboard
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