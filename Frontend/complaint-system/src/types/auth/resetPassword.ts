export interface RequestResetPassword {
  email: string;
}

export interface VerifyResetPasswordOtp {
  email: string;
  otp: string;
}

export interface CreateNewPassword {
  email: string;
  new_password: string;
  confirm_new_password: string;
}