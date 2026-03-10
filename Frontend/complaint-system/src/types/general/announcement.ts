import type { UserData } from "./user";
import type { BarangayAccount } from "../barangay/barangayAccount";

export interface AnnouncementMedia {
    id: number;
    announcement_id: number;
    media_url: string;
    media_type: string;
    uploaded_at: Date;
}

export interface Announcement {
    id: number;
    title: string;
    content: string;
    uploader_id: number;
    uploader: UserData;
    barangay_account?: BarangayAccount;
    media: AnnouncementMedia[];
    created_at: Date;
    updated_at: Date;
}