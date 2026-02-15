import { create } from "zustand";
import type { UserData } from "../types/user/User";
import { userApi } from "../services/axios/ApiServices";

interface UserState {
    user: UserData | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    accessToken: string | null;

    fetchUser: () => Promise<void>;
    setUser: (user: UserData | null) => void;
    setAccessToken: (token: string | null) => void;
    clearUser: () => void;
    mapUserData: (data: any) => UserData;
}

export const useCurrentUser = create<UserState>((set) => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    accessToken: null,

    fetchUser: async () => {
        if (!useCurrentUser.getState().accessToken) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
        }
        try {
            set({ isLoading: true });
            const res = await userApi.get("/profile", { withCredentials: true });
            const userData = res.data;
            const user = useCurrentUser.getState().mapUserData(userData);
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            set({ user: null, isAuthenticated: false, accessToken: null, isLoading: false });
        }
    },
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAccessToken: (token) => set({ accessToken: token }),
    clearUser: () => set({ user: null, isAuthenticated: false, accessToken: null }),
    mapUserData: (data) => {
        return {
            id: data.id,
            email: data.email,
            first_name: data.first_name,
            middle_name: data.middle_name,
            last_name: data.last_name,
            suffix: data.suffix,
            role: data.role,
            age: data.age,
            birthdate: data.birthdate,
            barangay: data.barangay,
            full_address: data.full_address,
            gender: data.gender,
            phone_number: data.phone_number,
            zip_code: data.zip_code,
            id_type: data.id_type,
            id_number: data.id_number,
            latitude: data.latitude,
            longitude: data.longitude,
            front_id: data.front_id,
            back_id: data.back_id,
            selfie_with_id: data.selfie_with_id
        }
    }


}));