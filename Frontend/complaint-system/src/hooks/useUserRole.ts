import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types/auth/userRole";

export type { UserRole };

/**
 * Hook to get the current user's role and related utilities
 */
export const useUserRole = () => {
  const userRole = useAuthStore(state => state.userRole);
  const barangayAccountData = useAuthStore(state => state.barangayAccountData);
  const departmentAccountData = useAuthStore(state => state.departmentAccountData);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const isBarangayOfficial = userRole === 'barangay_official';
  const isLguOfficial = userRole === 'lgu_official';
  const isDepartmentStaff = userRole === 'department_staff';

  // Get user-specific data
  const getUserData = () => {
    if (isBarangayOfficial) return barangayAccountData;
    if (isDepartmentStaff) return departmentAccountData;
    return null;
  };

  // Get user email based on role
  const getUserEmail = () => {
    if (isBarangayOfficial) return barangayAccountData?.barangay_account?.user?.email;
    if (isDepartmentStaff) return departmentAccountData?.user?.email;
    return null;
  };

  // Get display name based on role
  const getDisplayName = () => {
    if (isBarangayOfficial) {
      const user = barangayAccountData?.barangay_account?.user;
      return user?.first_name 
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : barangayAccountData?.barangay_name || 'Barangay Official';
    }
    if (isDepartmentStaff) {
      const user = departmentAccountData?.user;
      return user?.first_name 
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : 'Department Staff';
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
    getUserData,
    getUserEmail,
    getDisplayName,
  };
};
