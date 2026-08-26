import {usersApi} from "../axios/apiServices";

const deleteAccount = async (email: string) => {
  try {
    return await usersApi.delete(`/delete-account?email=${encodeURIComponent(email)}`);
  }catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

const verifyDeleteAccountOTP = async (email: string, otp: string) => {
  try {
    return await usersApi.post("/verify-delete-account-otp", { email, otp });
  } catch (error) {
    console.error("Error verifying delete account OTP:", error);
    throw error;
  }
};

export { deleteAccount, verifyDeleteAccountOTP };