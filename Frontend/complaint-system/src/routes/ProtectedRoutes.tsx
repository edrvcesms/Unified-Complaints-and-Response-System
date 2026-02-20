import { Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { useBarangayStore } from "../store/authStore";
import LoadingIndicator from "../components/LoadingIndicator";

interface ProtectedRouteProps {
  isAllowed: boolean;
  redirectPath?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAllowed,
  redirectPath = "/",
  children,
}) => {
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
};

export const BarangayProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useBarangayStore((state) => state.barangayAccessToken);
  const isLoading = useBarangayStore((state) => state.isLoading);

  if (isLoading) return <LoadingIndicator />;

  return (
    <ProtectedRoute isAllowed={!!isAuthenticated} redirectPath="/login">
      {children}
    </ProtectedRoute>
  );
}
export const AuthRoutes: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useBarangayStore((state) => state.barangayAccessToken);
  const isLoading = useBarangayStore((state) => state.isLoading);

  if (isLoading) return <LoadingIndicator />;

  return (
    <ProtectedRoute isAllowed={!isAuthenticated} redirectPath="/dashboard">
      {children}
    </ProtectedRoute>
  );
}
