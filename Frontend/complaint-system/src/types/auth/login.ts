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
