import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types/auth/userRole";

export type { UserRole };

export const useUserRole = () => {
  const userRole = useAuthStore(state => state.userRole);
  const barangayAccountData = useAuthStore(state => state.barangayAccountData);
  const departmentAccountData = useAuthStore(state => state.departmentAccountData);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const isBarangayOfficial = userRole === 'barangay_official';
  const isLguOfficial = userRole === 'lgu_official';
  const isDepartmentStaff = userRole === 'department_staff';
  
  const isValidRole = isBarangayOfficial || isLguOfficial || isDepartmentStaff;
  const hasInvalidRole = !isValidRole;

  const getUserData = () => {
    if (isBarangayOfficial) return barangayAccountData;
    if (isDepartmentStaff) return departmentAccountData;
    return null;
  };

  const getUserEmail = () => {
    if (isBarangayOfficial) return barangayAccountData?.barangay_account?.user?.email;
    if (isDepartmentStaff) return departmentAccountData?.department_account.user?.email;
    return null;
  };

  const getDisplayName = () => {
    if (isBarangayOfficial) {
      const user = barangayAccountData?.barangay_account?.user;
      return user?.first_name 
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : barangayAccountData?.barangay_name || 'Barangay Official';
    }
    if (isDepartmentStaff) {
      const user = departmentAccountData?.department_name;
      return user || 'Department Staff';
    }
    if (isLguOfficial) {
      return 'LGU Official';
    }
    return 'User';
  };

  return {
    userRole,
    isBarangayOfficial,
    isLguOfficial,
    isDepartmentStaff,
    isAuthenticated,
    isValidRole,
    hasInvalidRole,
    getUserData,
    getUserEmail,
    getDisplayName,
  };
};
