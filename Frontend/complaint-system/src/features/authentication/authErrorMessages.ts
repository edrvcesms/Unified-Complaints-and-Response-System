type Translate = (key: string, options?: Record<string, unknown>) => string;

export const translateAuthError = (message: string, t: Translate) => {
  if (message === "Email is required.") return t("auth.emailRequired");
  if (message.includes("Email must not exceed")) return t("auth.emailTooLong");
  if (message.includes("Email contains invalid repeated characters.")) return t("auth.emailRepeated");
  if (message.includes("valid email domain")) return t("auth.invalidEmailDomain");
  if (message.includes("valid email address")) return t("auth.invalidEmail");
  if (message === "Password is required.") return t("auth.passwordRequired");
  if (message.includes("Password must be at least")) return t("auth.passwordTooShort");
  if (message.includes("Password must not exceed")) return t("auth.passwordTooLong");
  if (message.includes("Password contains too many repeated characters.")) return t("auth.passwordRepeated");
  return message;
};