import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { PasswordInput } from "../authentication/components/PasswordInputs";
import { AlertBanner } from "../authentication/components/AlertBanner";
import { requestChangePassword, verifyResetPasswordOtp, createNewPassword } from "../../services/authentication/auth";
import { validatePassword } from "../../utils/validators";
import type { LoginRequestData } from "../../types/auth/login";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "password" | "otp";

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const createMutation = useMutation({
    mutationFn: () => createNewPassword({ email, new_password: newPassword, confirm_new_password: confirmPassword }),
    onSuccess: () => {
      setStep("password");
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setError("");
      onClose();
    },
    onError: (passwordError: any) => setError(passwordError?.message || t("auth.passwordResetFailed")),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyResetPasswordOtp({ email, otp }),
    onSuccess: () => createMutation.mutate(),
    onError: (verificationError: any) => setError(verificationError?.message || t("auth.verificationFailed")),
  });

  const requestMutation = useMutation({
    mutationFn: requestChangePassword,
    onSuccess: (response) => {
      setEmail(response.email);
      setError("");
      setStep("otp");
    },
    onError: (requestError: any) => setError(requestError?.message || t("auth.requestFailed")),
  });

  const isLoading = requestMutation.isPending || verifyMutation.isPending || createMutation.isPending;

  const close = () => {
    if (isLoading) return;
    setStep("password");
    setEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setOtp("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (step === "password") {
      const passwordError = validatePassword({ email: "", password: newPassword } as LoginRequestData);
      if (passwordError) {
        setError(Object.values(passwordError)[0] || t("auth.passwordResetFailed"));
        return;
      }
      if (!confirmPassword) {
        setError(t("auth.confirmPasswordRequired"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("auth.passwordMismatch"));
        return;
      }
      requestMutation.mutate();
      return;
    }

    if (otp.length !== 6) {
      setError(t("auth.invalidOtp"));
      return;
    }
    verifyMutation.mutate();
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = otp.padEnd(6, " ").split("");
    nextOtp[index] = digit;
    setOtp(nextOtp.join("").trimEnd());
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("nav.changePassword")}</h2>
          <button type="button" onClick={close} disabled={isLoading} aria-label={t("modal.cancel")} className="text-gray-400 hover:text-gray-700 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-600">{step === "password" ? t("auth.changePasswordHelp") : t("auth.otpHelp")}</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {step === "password" ? (
            <>
              <div>
                <label htmlFor="change-new-password" className="mb-1 block text-sm font-medium text-gray-700">{t("auth.newPassword")}</label>
                <PasswordInput id="change-new-password" name="new_password" value={newPassword} showPassword={showNewPassword} hasError={!!error} onChange={(event) => setNewPassword(event.target.value)} onToggle={() => setShowNewPassword((visible) => !visible)} autoComplete="new-password" placeholder={t("auth.passwordPlaceholder")} maxLength={128} />
              </div>
              <div>
                <label htmlFor="change-confirm-password" className="mb-1 block text-sm font-medium text-gray-700">{t("auth.confirmPassword")}</label>
                <PasswordInput id="change-confirm-password" name="confirm_new_password" value={confirmPassword} showPassword={showConfirmPassword} hasError={!!error} onChange={(event) => setConfirmPassword(event.target.value)} onToggle={() => setShowConfirmPassword((visible) => !visible)} autoComplete="new-password" placeholder={t("auth.confirmPassword")} maxLength={128} />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">{t("auth.otpLabel")}</label>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input key={index} ref={(element) => { otpRefs.current[index] = element; }} value={otp[index] ?? ""} onChange={(event) => handleOtpChange(index, event.target.value)} inputMode="numeric" maxLength={1} className="h-12 rounded-lg border border-primary-300 text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500" />
                ))}
              </div>
            </div>
          )}
          {error && <AlertBanner message={error} />}
          <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? t("modal.processing") : step === "password" ? t("nav.changePassword") : t("auth.verifyCode")}</button>
          <button type="button" onClick={close} disabled={isLoading} className="w-full text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">{t("modal.cancel")}</button>
        </form>
      </div>
    </div>
  );
};