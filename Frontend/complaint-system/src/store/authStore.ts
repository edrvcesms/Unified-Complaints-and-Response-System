import { create } from "zustand";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";
import type { UserRole } from "../types/auth/userRole";
import { refreshToken } from "../services/authentication/token";
import { logoutBarangayAccount } from "../services/authentication/barangayAuth";

interface AuthState {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    isCheckingAuth: boolean;
    setIsCheckingAuth: (checking: boolean) => void;
    barangayAccountData: BarangayAccountData | null;
    setBarangayAccountData: (data: BarangayAccountData | null) => void;
    departmentAccountData: any | null;
    setDepartmentAccountData: (data: any | null) => void;
    userRole: UserRole | null;
    setUserRole: (role: UserRole | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isAuthenticated: boolean;
    mapDataFromBackend: (data: any) => void;
    clearAuth: () => Promise<void>;
    clearAuthLocal: () => void;
    refreshAccessToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    setAccessToken: (token) => set({ accessToken: token }),
    barangayAccountData: null,
    setBarangayAccountData: (data) => set({ barangayAccountData: data }),
    departmentAccountData: null,
    setDepartmentAccountData: (data) => set({ departmentAccountData: data }),
    userRole: null,
    setUserRole: (role) => set({ userRole: role }),
    isCheckingAuth: true,
    setIsCheckingAuth: (checking) => set({ isCheckingAuth: checking }),
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    isAuthenticated: false,
    mapDataFromBackend: (data: any) => {
        // Determine role from the response data
        let role = null;
        let barangayData = null;
        let departmentData = null;

        if (data.barangayAccountData) {
            role = data.barangayAccountData.barangay_account?.user?.role || 'barangay_official';
            barangayData = {
                id: data.barangayAccountData.id,
                barangay_name: data.barangayAccountData.barangay_name,
                barangay_address: data.barangayAccountData.barangay_address,
                barangay_contact_number: data.barangayAccountData.barangay_contact_number,
                barangay_email: data.barangayAccountData.barangay_email,
                barangay_account: {
                    id: data.barangayAccountData.barangay_account.id,
                    user_id: data.barangayAccountData.barangay_account.user_id,
                    barangay_id: data.barangayAccountData.barangay_account.barangay_id,
                    user: {
                        id: data.barangayAccountData.barangay_account.user.id,
                        email: data.barangayAccountData.barangay_account.user.email,
                        first_name: data.barangayAccountData.barangay_account.user.first_name,
                        middle_name: data.barangayAccountData.barangay_account.user.middle_name,
                        last_name: data.barangayAccountData.barangay_account.user.last_name,
                        suffix: data.barangayAccountData.barangay_account.user.suffix,
                        role: data.barangayAccountData.barangay_account.user.role,
                        age: data.barangayAccountData.barangay_account.user.age,
                        birthdate: data.barangayAccountData.barangay_account.user.birthdate,
                        barangay: data.barangayAccountData.barangay_account.user.barangay,
                        full_address: data.barangayAccountData.barangay_account.user.full_address,
                        zip_code: data.barangayAccountData.barangay_account.user.zip_code,
                        id_type: data.barangayAccountData.barangay_account.user.id_type,
                        id_number: data.barangayAccountData.barangay_account.user.id_number,
                        latitude: data.barangayAccountData.barangay_account.user.latitude,
                        longitude: data.barangayAccountData.barangay_account.user.longitude,
                        front_id: data.barangayAccountData.barangay_account.user.front_id,
                        back_id: data.barangayAccountData.barangay_account.user.back_id,
                        selfie_with_id: data.barangayAccountData.barangay_account.user.selfie_with_id,
                        phone_number: data.barangayAccountData.barangay_account.user.phone_number,
                        gender: data.barangayAccountData.barangay_account.user.gender,
                        is_administrator: data.barangayAccountData.barangay_account.user.is_administrator,
                        last_login: data.barangayAccountData.barangay_account.user.last_login
                    }
                }
            };
        } else if (data.departmentAccountData) {
            role = data.departmentAccountData.user?.role || 'department_staff';
            departmentData = data.departmentAccountData;
        } else {
            // For LGU or other roles without specific account data
            role = data.role || 'lgu_official';
        }

        set({
            barangayAccountData: barangayData,
            departmentAccountData: departmentData,
            userRole: role,
            isAuthenticated: true
        });
    },
    clearAuth: async () => {
        set({ isLoading: true });
        try {
            await logoutBarangayAccount();
            set({
                accessToken: null,
                barangayAccountData: null,
                departmentAccountData: null,
                userRole: null,
                isAuthenticated: false
            });
        } catch (error) {
            console.error("Error during logout:", error);
            set({
                accessToken: null,
                barangayAccountData: null,
                departmentAccountData: null,
                userRole: null,
                isAuthenticated: false
            });
        } finally {
            set({ isLoading: false });
        }
    },
    clearAuthLocal: () => {
        set({
            accessToken: null,
            barangayAccountData: null,
            departmentAccountData: null,
            userRole: null,
            isAuthenticated: false,
            isLoading: false
        });
    },
    refreshAccessToken: async () => {
        set({ isCheckingAuth: true });

        try {
            const data = await refreshToken();

            if (data?.access_token) {
                set({
                    accessToken: data.access_token,
                    isAuthenticated: true
                });
                
                // Map account data if available
                const store = useAuthStore.getState();
                store.mapDataFromBackend(data);
            } else {
                set({
                    accessToken: null,
                    barangayAccountData: null,
                    departmentAccountData: null,
                    userRole: null,
                    isAuthenticated: false
                });
            }
        } catch (error) {
            set({
                accessToken: null,
                barangayAccountData: null,
                departmentAccountData: null,
                userRole: null,
                isAuthenticated: false
            });
        } finally {
            set({ isCheckingAuth: false });
        }
    }
}));

// Backward compatibility - keep the old export name
export const useBarangayStore = useAuthStore;