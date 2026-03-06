import type { UserData } from "./user";
import type { BarangayAccount } from "../barangay/barangayAccount";

export interface Announcement {
    id: number;
    title: string;
    content: string;
    uploader_id: number;
    uploader: UserData;
    barangay_account?: BarangayAccount;
    created_at: Date;
    updated_at: Date;
}