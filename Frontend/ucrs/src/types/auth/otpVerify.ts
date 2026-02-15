export interface OtpVerificationData {
    email: string;
    password: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    age: number;
    birthdate: string;
    gender: string;
    phone_number: string;
    barangay: string;
    full_address: string;
    zip_code: string;
    id_type: string;
    id_number: string;
    latitude?: string;
    longitude?: string;
    otp: string;
}