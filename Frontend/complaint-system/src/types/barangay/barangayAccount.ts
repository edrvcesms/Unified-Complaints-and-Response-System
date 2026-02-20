import type { UserData } from "../general/user";

export interface BarangayAccountData {
  id: number;
  barangay_name: string;
  barangay_address: string;
  barangay_contact_number: string;
  barangay_email: string;
  barangay_account: BarangayAccount;
}

export interface BarangayData {
  barangay_name: string;
  barangay_address: string;
  barangay_contact_number: string;
  barangay_email: string;
}

interface BarangayAccount {
  id: number;
  user_id: number;
  barangay_id: number;
  user: UserData
}