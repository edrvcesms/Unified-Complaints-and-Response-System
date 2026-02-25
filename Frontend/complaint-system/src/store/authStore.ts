import { create } from "zustand";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";
import { refreshToken } from "../services/authentication/token";
import { logoutBarangayAccount } from "../services/authentication/barangayAuth";

interface BarangayAuthState {
    barangayAccessToken: string | null;
    setBarangayAccessToken: (token: string | null) => void;
    isCheckingAuth: boolean;
    setIsCheckingAuth: (checking: boolean) => void;
    barangayAccountData: BarangayAccountData | null;
    setBarangayAccountData: (data: BarangayAccountData | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isAuthenticated: boolean;
    mapDataFromBackend: (data: any) => void;
    clearBarangayAuth: () => Promise<void>;
    clearBarangayAuthLocal: () => void;
    refreshAccessToken: () => Promise<void>;
}

export const useBarangayStore = create<BarangayAuthState>((set) => ({
    barangayAccessToken: null,
    setBarangayAccessToken: (token) => set({ barangayAccessToken: token }),
    barangayAccountData: null,
    setBarangayAccountData: (data) => set({ barangayAccountData: data }),
    isCheckingAuth: true,
    setIsCheckingAuth: (checking) => set({ isCheckingAuth: checking }),
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),
    isAuthenticated: false,
    mapDataFromBackend: (data: BarangayAccountData) => {
        set({
            barangayAccountData: {
                id: data.id,
                barangay_name: data.barangay_name,
                barangay_address: data.barangay_address,
                barangay_contact_number: data.barangay_contact_number,
                barangay_email: data.barangay_email,
                barangay_account: {
                    id: data.barangay_account.id,
                    user_id: data.barangay_account.user_id,
                    barangay_id: data.barangay_account.barangay_id,
                    user: {
                        id: data.barangay_account.user.id,
                        email: data.barangay_account.user.email,
                        first_name: data.barangay_account.user.first_name,
                        middle_name: data.barangay_account.user.middle_name,
                        last_name: data.barangay_account.user.last_name,
                        suffix: data.barangay_account.user.suffix,
                        role: data.barangay_account.user.role,
                        age: data.barangay_account.user.age,
                        birthdate: data.barangay_account.user.birthdate,
                        barangay: data.barangay_account.user.barangay,
                        full_address: data.barangay_account.user.full_address,
                        zip_code: data.barangay_account.user.zip_code,
                        id_type: data.barangay_account.user.id_type,
                        id_number: data.barangay_account.user.id_number,
                        latitude: data.barangay_account.user.latitude,
                        longitude: data.barangay_account.user.longitude,
                        front_id: data.barangay_account.user.front_id,
                        back_id: data.barangay_account.user.back_id,
                        selfie_with_id: data.barangay_account.user.selfie_with_id,
                        phone_number: data.barangay_account.user.phone_number,
                        gender: data.barangay_account.user.gender,
                        is_administrator: data.barangay_account.user.is_administrator,
                        last_login: data.barangay_account.user.last_login
                    }
                }
            },
            isAuthenticated: true
        });
    },
    clearBarangayAuth: async () => {
        set({ isLoading: true });
        try {
            await logoutBarangayAccount();
            set({
                barangayAccessToken: null,
                barangayAccountData: null,
                isAuthenticated: false
            });
        } catch (error) {
            console.error("Error during logout:", error);
            set({
                barangayAccessToken: null,
                barangayAccountData: null,
                isAuthenticated: false
            });
        } finally {
            set({ isLoading: false });
        }
    },
    clearBarangayAuthLocal: () => {
        set({
            barangayAccessToken: null,
            barangayAccountData: null,
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
                    barangayAccessToken: data.access_token,
                    barangayAccountData: data.barangayAccountData,
                    isAuthenticated: true
                });
            } else {
                set({
                    barangayAccessToken: null,
                    barangayAccountData: null,
                    isAuthenticated: false
                });
            }
        } catch (error) {
            set({
                barangayAccessToken: null,
                barangayAccountData: null,
                isAuthenticated: false
            });
        } finally {
            set({ isCheckingAuth: false });
        }
    }
}));