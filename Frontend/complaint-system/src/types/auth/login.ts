import type { BarangayAccount } from "../barangay/barangayAccount";

export interface LoginRequestData {
  role: string;
  email: string;
  password: string;
}
export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface LoginResponseData {
  barangayAccessToken: string;
  barangayAccountData: {
    id: number;
    barangay_name: string;
    barangay_address: string;
    barangay_contact_number: string;
    barangay_email: string;
    barangay_account: BarangayAccount;
  };
}