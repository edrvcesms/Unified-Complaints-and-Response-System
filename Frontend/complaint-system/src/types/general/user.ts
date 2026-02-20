export interface UserData {
  id: number;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix: string | null;
  role: string;
  age: number;
  birthdate: string;
  barangay: string;
  full_address: string;
  zip_code: string;
  gender: string;
  phone_number: string;
  id_type: string;
  id_number: string;
  latitude: number;
  longitude: number;
  front_id: string;
  back_id: string;
  selfie_with_id: string;
  is_administrator: boolean;
  last_login: string;
}