import { create } from "zustand";
import type { BarangayAccountData } from "../types/barangay/barangayAccount";
import { barangayApi } from "../../../complaint-system/src/services/axios/apiServices";

interface BarangayAuthState {
    barangayAccessToken: string | null;
    setBarangayAccessToken: (token: string | null) => void;
    barangayAccountData: BarangayAccountData | null;
    setBarangayAccountData: (data: BarangayAccountData | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isAuthenticated: boolean;
    mapDataFromBackend: (data: any) => void;
    clearBarangayAuth: () => Promise<void>;
    fetchBarangayAccountData: () => Promise<void>;
}

export const useBarangayStore = create<BarangayAuthState>((set) => ({
    barangayAccessToken: null,
    setBarangayAccessToken: (token) => set({ barangayAccessToken: token }),
    barangayAccountData: null,
    setBarangayAccountData: (data) => set({ barangayAccountData: data }),
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
        set({
            barangayAccessToken: null,
            barangayAccountData: null,
            isAuthenticated: false
        });
    },
    fetchBarangayAccountData: async () => {
        set({ isLoading: true });
        try {
            const response = await barangayApi.get("/profile");
            set({ barangayAccountData: response.data, isAuthenticated: true });
        } catch (error) {
            console.error("Failed to fetch barangay account data:", error);
            set({ barangayAccountData: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    }
}));